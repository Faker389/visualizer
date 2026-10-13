import { collection, doc, getDoc, setDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { decryptSimple, EncryptedUserSimple, encryptSimple } from "./crypto";
import { userInterface } from "./types";
import { checkLoginMethod } from "./authFunctions";

export const addNewUserToDb =async (user:userInterface)=>{
    try {
        const userRef = doc(db, "users", user.id)
        const userSnap = await getDoc(userRef)
        const encryptedUser = encryptSimple(user);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            ...encryptedUser
          })
        }
        
        return true
      } catch (error) {
        console.log(error)
        throw new Error("Failed to add user to database")
      }
}
export  async function getUserByCredential(credentialname:string,email: string):Promise<userInterface|null> {
     
    try {
      const q = query(
      collection(db, "users"),
      where(credentialname, "==", email)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    // assuming email is unique → take first match
    const doc = snapshot.docs[0] 
    const data = doc.data() as EncryptedUserSimple
    const userReturn = {...decryptSimple(data),email:data.email}
    return userReturn; 
    } catch (error) {
      return null
    }
  }

  export async function updateUserSignInMethod(userID:string,loginMethod:string){
    const checkUserSignInMethod = await checkLoginMethod(userID,"password")
    if(!checkUserSignInMethod) return;
    try {
      const userRef = doc(db, "users", userID);
      await updateDoc(userRef, {
        authMethod:loginMethod
      });
      return true;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to update user in database");
    }
  }