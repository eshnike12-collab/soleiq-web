import { FlowController } from "@/components/flow/FlowController";
import { PhoneFrame } from "@/components/flow/PhoneFrame";
import { AuthGate } from "@/components/auth/AuthGate";

export default function Home() {
  return (
    <AuthGate>
      <PhoneFrame>
        <FlowController />
      </PhoneFrame>
    </AuthGate>
  );
}
