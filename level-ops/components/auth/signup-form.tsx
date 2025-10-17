"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function SignupForm() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(password));
  const formIsValid =
    email.length > 0 &&
    firstName.length > 0 &&
    lastName.length > 0 &&
    allRequirementsMet &&
    passwordsMatch;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formIsValid) {
      setError("Please fill in all fields correctly.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Successfully signed up
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign up. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          placeholder="you@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
            placeholder="John"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
            placeholder="Smith"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowPasswordRequirements(true)}
          disabled={isLoading}
          placeholder="••••••••"
        />

        {showPasswordRequirements && password.length > 0 && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-1">
            {PASSWORD_REQUIREMENTS.map((req, index) => {
              const isMet = req.test(password);
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {isMet ? (
                    <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  )}
                  <span className={isMet ? "text-green-700" : "text-gray-600"}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          placeholder="••••••••"
        />

        {confirmPassword.length > 0 && (
          <div className="flex items-center gap-2 text-sm mt-1">
            {passwordsMatch ? (
              <>
                <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                <span className="text-green-700">Passwords match</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                <span className="text-red-700">Passwords do not match</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!formIsValid || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
