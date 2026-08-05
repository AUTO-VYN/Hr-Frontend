import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "HR Setu",
  description: "HR & Payroll Software Built for Auto Dealerships",
  icons: {
    icon: "/hr-setu-logo.png",
  },
};

// Runs before paint to avoid a light-mode flash when the saved
// preference is dark.
const themeInitScript = `
(function() {
  try {
    var saved = window.localStorage.getItem('hrsetu.theme');
    var dark = saved ? saved === 'dark' : false;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
