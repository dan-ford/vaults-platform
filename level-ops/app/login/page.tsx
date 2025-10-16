"use client";

import { Auth } from "@supabase/auth-ui-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { SocialButtons } from "@/components/auth/social-buttons";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setIsLoading(true);
        router.push("/dashboard");
      }
      if (event === "SIGNED_OUT") {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md px-4">
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={150}
              height={45}
              priority
              style={{ width: '150px', height: 'auto' }}
            />
          </div>
          <p className="text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <SocialButtons
              redirectTo={
                typeof window !== "undefined"
                  ? `${window.location.origin}/dashboard`
                  : undefined
              }
            />
            <Auth
          supabaseClient={supabase as never}
          appearance={{
            theme: {
              default: {
                colors: {
                  brand: '#26ace2',
                  brandAccent: '#1a90c2',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#f9fafb',
                  defaultButtonBackgroundHover: '#f3f4f6',
                  defaultButtonBorder: 'transparent',
                  defaultButtonText: '#333333',
                  dividerBackground: '#e5e7eb',
                  inputBackground: '#f9fafb',
                  inputBorder: 'transparent',
                  inputBorderHover: 'transparent',
                  inputBorderFocus: '#26ace2',
                  inputText: '#333333',
                  inputLabelText: '#6b7280',
                  inputPlaceholder: '#9ca3af',
                  messageText: '#333333',
                  messageTextDanger: '#ef4444',
                  anchorTextColor: '#26ace2',
                  anchorTextHoverColor: '#1a90c2',
                },
                space: {
                  spaceSmall: '8px',
                  spaceMedium: '16px',
                  spaceLarge: '24px',
                },
                fontSizes: {
                  baseBodySize: '14px',
                  baseInputSize: '14px',
                  baseLabelSize: '14px',
                  baseButtonSize: '14px',
                },
                fonts: {
                  bodyFontFamily: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                  buttonFontFamily: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                  inputFontFamily: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                  labelFontFamily: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
                },
                borderWidths: {
                  buttonBorderWidth: '0px',
                  inputBorderWidth: '0px',
                },
                radii: {
                  borderRadiusButton: '8px',
                  buttonBorderRadius: '8px',
                  inputBorderRadius: '8px',
                },
              },
            },
            style: {
              button: { height: '45px', padding: '0 16px' },
              input: { height: '45px', padding: '0 16px' },
            },
          }}
          providers={[]}
          redirectTo={
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined
          }
          />
          </div>
        )}
      </div>
    </div>
  );
}
