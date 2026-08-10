<script setup lang="ts">
import EmailFooter from "./components/emailFooter.vue";
import EmailHeader from "./components/emailHeader.vue";

interface Props {
  userName?: string;
  verificationUrl?: string;
  hostelName?: string;
}

withDefaults(defineProps<Props>(), {
  userName: "User",
  verificationUrl: "#",
  hostelName: "Hostel",
});
</script>

<template>
  <EHtml lang="en">
    <ESubject>Verify your email address</ESubject>

    <EHead />

    <EBody style="margin:0;padding:0;background-color:#f5f5f0;font-family: 'Poppins', sans-serif;">
      <EPreview>Verify your email</EPreview>

      <ESection style="background-color:#f5f5f0;padding:24px 12px;">
        <EContainer style="max-width:520px;background-color:#ffffff;border-radius:6px;overflow:hidden;">
          <EmailHeader :hostel-name="hostelName" />

          <ESection style="padding:18px 22px;">
            <EHeading
              as="h1"
              style="margin:0 0 3px;font-size:20px;font-weight:600;color:#265757;letter-spacing:-0.01em;line-height:1.3;"
            >
              Verify your email address
            </EHeading>

            <EText style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;">
              Hi <strong>{{ userName }}</strong>, thanks for signing up. Please confirm your email address to activate your account.
            </EText>

            <EButton
              :href="verificationUrl"
              style="background-color:#3d8582;border-radius:6px;padding:10px 13px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;display:inline-block;"
            >
              Verify email address
            </EButton>

            <EText style="margin:16px 0 0;font-size:13px;color:#6b7280;">
              Or copy this link into your browser:
            </EText>

            <EText style="margin:8px 0 16px;background-color:#e9f4f3;border-radius:4px;padding:12px 14px;font-family:'Courier New',Courier,monospace;font-size:13px;color:#265757;word-break:break-all;line-height:1.6;">
              {{ verificationUrl }}
            </EText>

            <EHr style="margin:15px 0;border-top:1px solid #e9f4f3;" />

            <EText style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
              This link expires in <strong>10 minutes</strong>. If you didn't create an account, no action is needed.
            </EText>
          </ESection>

          <EmailFooter :hostel-name="hostelName" />
        </EContainer>
      </ESection>
    </EBody>
  </EHtml>
</template>
