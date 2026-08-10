<script setup lang="ts">
import EmailFooter from "./components/emailFooter.vue";
import EmailHeader from "./components/emailHeader.vue";

interface Props {
  userName?: string;
  hostelName?: string;
  dashboardUrl?: string;
}

const {
  userName = "Resident",
  hostelName = "Kayanest",
  dashboardUrl = "#",
} = defineProps<Props>();
</script>

<template>
  <EHtml lang="en">
    <ESubject>Welcome to {{ hostelName }}</ESubject>

    <EHead />

    <EBody>
      <EPreview>Welcome to {{ hostelName }}! We are excited to have you on board.</EPreview>

      <EContainer>
        <EmailHeader :hostel-name="hostelName" />

        <ESection>
          <EHeading as="h1">
            Welcome to {{ hostelName }}!
          </EHeading>

          <EText>
            Hi {{ userName }},
          </EText>

          <EText>
            Thank you for joining {{ hostelName }}. Your account has been created successfully, and you're all set to manage your room bookings, view announcements, and track invoices seamlessly.
          </EText>

          <EText>
            Click the button below to log in to your dashboard and get started.
          </EText>

          <EButton :href="dashboardUrl">
            Go to Dashboard
          </EButton>

          <EText>
            If the button doesn't work, you can copy and paste this link into your browser:
          </EText>

          <EText>
            {{ dashboardUrl }}
          </EText>

          <EHr />

          <EText>
            If you have any questions or need assistance, feel free to contact our hostel support team.
          </EText>

          <EText>
            Best regards,<br>
            The {{ hostelName }} Team
          </EText>
        </ESection>

        <EmailFooter :hostel-name="hostelName" />
      </EContainer>
    </EBody>
  </EHtml>
</template>
