import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut as firebaseSignOut,sendPasswordResetEmail,browserSessionPersistence,setPersistence} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {firebaseConfig,ownerUID} from './firebase-config.js';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const persistenceReady=setPersistence(auth,browserSessionPersistence);
let activeUser=null;
function reference(){if(!activeUser||activeUser.uid!==ownerUID)throw Error('Sign in with the portfolio owner account.');return doc(db,'portfolios',activeUser.uid);}
function unpack(snapshot){if(!snapshot.exists())return {data:null,revision:0};const d=snapshot.data();return {data:JSON.parse(d.payload),revision:d.revision};}
export function observeAuth(callback){return onAuthStateChanged(auth,async user=>{activeUser=null;if(user&&user.uid!==ownerUID){await firebaseSignOut(auth);callback(null,'This account does not have access to this portfolio.');return;}activeUser=user;callback(user);});}
export async function signIn(email,password){await persistenceReady;return signInWithEmailAndPassword(auth,email,password);}
export function signOut(){return firebaseSignOut(auth);}
export async function resetPassword(email){try{await sendPasswordResetEmail(auth,email);}catch(error){console.warn('Password setup failed:',error.code);throw error;}}
export async function load(){return unpack(await getDocFromServer(reference()));}
export function subscribe(onData,onError){return onSnapshot(reference(),{includeMetadataChanges:true},snapshot=>{if(!snapshot.metadata.hasPendingWrites&&!snapshot.metadata.fromCache){try{onData(unpack(snapshot));}catch(e){onError(e);}}},onError);}
export async function commit(data,expectedRevision){const ref=reference(),payload=JSON.stringify(data);if(new TextEncoder().encode(payload).length>700000)throw Error('Portfolio is too large to save. Export a backup before reducing the transaction history.');return runTransaction(db,async tx=>{const snapshot=await tx.get(ref);const revision=snapshot.exists()?snapshot.data().revision:0;if(revision!==expectedRevision){const error=Error('Your portfolio changed on another device. The latest saved version has been loaded.');error.code='portfolio/conflict';throw error;}tx.set(ref,{payload,revision:revision+1,updatedAt:serverTimestamp()});return revision+1;});}
