import {requireChatGPTUser} from "../chatgpt-auth";
import VeniceRoom from "./venice-room";
import "./venice.css";

export default async function VenicePage() {
  const user = await requireChatGPTUser("/venice");
  return <VeniceRoom displayName={user.displayName}/>;
}
