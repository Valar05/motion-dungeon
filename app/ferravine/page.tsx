import type {Metadata} from "next";
import FerravineLab from "./ferravine-lab";
import "./ferravine.css";

export const metadata: Metadata = {
  title: "Ferravine Vivisection · Motion Dungeon",
  description: "Scrub the 2024 Toyota Highlander-scale Ferravine candidate through shell, tendon, nerve, and mechanical layers.",
  openGraph: {
    title: "Ferravine Vivisection",
    description: "An animatable layer-peel specimen inside Motion Dungeon.",
    images: [{
      url: "https://motion-dungeon.dclarke1005.chatgpt.site/specimens/ferravine-layer-peel/Ferravine_Layer_Peel_Master_v1.png",
      width: 1536,
      height: 1024,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ferravine Vivisection",
    description: "An animatable layer-peel specimen inside Motion Dungeon.",
    images: ["https://motion-dungeon.dclarke1005.chatgpt.site/specimens/ferravine-layer-peel/Ferravine_Layer_Peel_Master_v1.png"],
  },
};

export default function FerravinePage() {
  return <FerravineLab/>;
}
