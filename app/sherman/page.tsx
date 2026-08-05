import type {Metadata} from "next";
import ShermanShell from "./sherman-shell";
import "./sherman.css";

export const metadata: Metadata = {
  title: "Sherman Model Lab · Motion Dungeon",
  description: "Inspect, compare, and provenance-lock Sherman tank 3D assets.",
  openGraph: {
    title: "Sherman Model Lab",
    description: "Motion Dungeon asset forensics: inspect, compare, and provenance-lock Sherman tank 3D assets.",
    images: [{url: "https://motion-dungeon.dclarke1005.chatgpt.site/sherman-og.png", width: 1732, height: 910}],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sherman Model Lab",
    description: "Inspect, compare, and provenance-lock Sherman tank 3D assets.",
    images: ["https://motion-dungeon.dclarke1005.chatgpt.site/sherman-og.png"],
  },
};

export default function ShermanPage() {
  return <ShermanShell/>;
}
