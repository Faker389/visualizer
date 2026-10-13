import { collection, getDocs, query, where } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "./firebase";
import { decryptSimple, EncryptedUserSimple } from "./crypto";
import { userInterface } from "./types";


export  async function checkLoginMethod(email: string,searchTarget:"password"|"google"):Promise<boolean> {
   
    try {
      const q = query(
      collection(db, "users"),
      where("email", "==", email)
    )
  
    const snapshot = await getDocs(q)
  
    if (snapshot.empty) {
      return false
    }
    // assuming email is unique → take first match
    const doc = snapshot.docs
    let response = false;
    for(let x=0;x<doc.length;x++){
      const data = doc[x].data() as userInterface;
      if(data.authMethod==searchTarget)response=true;
    }
    return response
  } catch (error) {
      return false
    }
  }
export async function loginFunction(){

}

export async function forgotFunction(email: string) {
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/change-password`,
    handleCodeInApp: true,
  })
}