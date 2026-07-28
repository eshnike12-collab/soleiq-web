import { FlowController } from "@/components/flow/FlowController";
import { FlowShell } from "@/components/flow/FlowShell";
import { AuthGate } from "@/components/auth/AuthGate";

export default function Home() {
  return (
    <AuthGate>
      <FlowShell>
        <FlowController />
      </FlowShell>
    </AuthGate>
  );
}
