import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "react-responsive-modal/styles.css";
import "react-tooltip/dist/react-tooltip.css";

import "./globals.css";
import Providers from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Bitcoin (BTC) Staking: Stake BTC on Babylon | Everstake",
  description:
    "Everstake is the best place to stake BTC on the Babylon blockchain. Get the most from secure staking, and the most trusted staking platform in crypto space.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Babylon - Staking Dashboard" />
      <meta name="description" content="BTC Staking Dashboard" key="desc" />
      <meta property="og:description" content="BTC Staking Dashboard" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="2048" />
      <meta property="og:image:height" content="1170" />
      <meta
        property="og:image"
        content="https://btcstaking.babylonchain.io/og.png"
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="BTC Staking Dashboard" />
      <meta name="twitter:description" content="BTC Staking Dashboard" />
      <meta
        name="twitter:image"
        content="https://btcstaking.babylonchain.io/og.png"
      />
      <meta name="twitter:image:type" content="image/png" />
      <meta name="twitter:image:width" content="2048" />
      <meta name="twitter:image:height" content="1170" />
      <body className={spaceGrotesk.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
