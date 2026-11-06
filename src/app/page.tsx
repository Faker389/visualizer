"use client";
import { getUserCookie } from "@/lib/cookies";
import { LoaderCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
async function checkUserCookie() {
  const userCookie = await getUserCookie();
  if (userCookie) {
    redirect("/dashboard");
  }else{
    redirect("/login");
  }
}
export default function Home() {
  useEffect(() => {
    checkUserCookie()
  }, []);
 return<div className="flex items-center justify-center h-screen">
  <LoaderCircle className="size-8 animate-spin" aria-hidden />
 </div>
}
