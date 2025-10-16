import React from "react";

interface EmailLayoutProps {
  children: React.ReactNode;
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#f9fafb",
        }}
      >
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#f9fafb", padding: "40px 0" }}
        >
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <tr>
                  <td style={{ padding: "40px 40px 0 40px" }}>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#1a1a1a",
                      }}
                    >
                      VAULTS
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "32px 40px" }}>{children}</td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "24px 40px",
                      borderTop: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        color: "#6b7280",
                        lineHeight: "20px",
                      }}
                    >
                      If you have any questions, please contact us at{" "}
                      <a
                        href="mailto:support@vaults.com"
                        style={{ color: "#26ace2", textDecoration: "none" }}
                      >
                        support@vaults.com
                      </a>
                    </p>
                    <p
                      style={{
                        margin: "12px 0 0 0",
                        fontSize: "12px",
                        color: "#9ca3af",
                      }}
                    >
                      © {new Date().getFullYear()} VAULTS. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
