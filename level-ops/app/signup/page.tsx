"use client";

import { SignupForm } from "@/components/auth/signup-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import Image from "next/image";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md px-4">
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <Link href="/">
              <Image
                src="/logo-stacked.png"
                alt="Vaults"
                width={120}
                height={120}
                priority
                style={{ width: '120px', height: 'auto' }}
              />
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-muted-foreground">
            Get started with Vaults today
          </p>
        </div>

        <div className="space-y-6">
          <SocialButtons
            redirectTo={
              typeof window !== "undefined"
                ? `${window.location.origin}/dashboard`
                : undefined
            }
          />

          <SignupForm />

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
