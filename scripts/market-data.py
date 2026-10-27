"""Download public market-wide CSE data. Never reads portfolio/account data."""
import concurrent.futures, datetime, json, pathlib, subprocess, time

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'market-data.json'
BASE = 'https://www.cse.lk/api/'

def post(endpoint, body=''):
    result = subprocess.run(['curl','-4','--fail','--silent','--show-error','--retry','2',
        '--connect-timeout','10','--max-time','30','--data',body,BASE+endpoint],capture_output=True)
    if result.returncode: raise RuntimeError(endpoint+' request failed')
    return json.loads(result.stdout.decode('utf-8'))

def day(ms):
    return datetime.datetime.fromtimestamp(ms/1000,datetime.timezone(datetime.timedelta(hours=5,minutes=30))).date().isoformat()

def detail(row):
    symbol=row['symbol']
    value={k:row.get(k) for k in ['symbol','name','price','previousClose','change','percentageChange','lastTradedTime','sharevolume','turnover','high','low','marketCap']}
    value['asOf']=day(row['lastTradedTime']) if row.get('lastTradedTime') else None
    for endpoint,key in [('companyInfoSummery','info'),('financials','reports')]:
        try:
            response=post(endpoint,'symbol='+symbol)
            if key=='info':
                info=response.get('reqSymbolInfo',{})
                value[key]={k:info.get(k) for k in ['p12HiPrice','p12LowPrice','wtdHiPrice','wtdLowPrice','mtdHiPrice','mtdLowPrice','quantityIssued','marketCap']}
                value['beta']=response.get('reqSymbolBetaInfo')
            else:
                value[key]={kind: sorted(response.get(field,[]),key=lambda x:x.get('uploadedDate') or 0,reverse=True)[:2]
                    for kind,field in [('annual','infoAnnualData'),('quarterly','infoQuarterlyData')]}
        except Exception:
            value[key+'Error']='Source unavailable during this refresh'
        time.sleep(.12)
    return symbol,value

def main():
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    rows=post('tradeSummary').get('reqTradeSummery',[])
    rows=[r for r in rows if isinstance(r.get('price'),(int,float)) and r['price']>0 and r.get('symbol')]
    if len(rows)<100: raise RuntimeError('Incomplete CSE quote response; preserving previous published data')
    previous=json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    stocks={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for symbol,value in pool.map(detail,rows):
            prior=previous.get('stocks',{}).get(symbol,{})
            history=prior.get('history',[])
            if value['asOf']:
                history=[r for r in history if r['date']!=value['asOf']]
                history.append({'date':value['asOf'],'close':value['price']})
            value['history']=sorted(history,key=lambda x:x['date'])[-260:]
            stocks[symbol]=value
    data={'version':1,'fetchedAt':now,'source':'Colombo Stock Exchange','sourceUrl':'https://www.cse.lk',
        'historyMethod':'End-of-day observations collected by this site; unadjusted for corporate actions.', 'stocks':stocks}
    OUT.write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
    print(json.dumps({'stocks':len(stocks),'fetchedAt':now,'detailFailures':sum('infoError' in x for x in stocks.values())}))

if __name__=='__main__': main()
