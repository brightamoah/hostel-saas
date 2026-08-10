<script setup lang="ts">

</script>

<template>
  <EHtml>
    <EHead />

    <EBody>
      <EPreview>
        You're now ready to make live transactions with Stripe!
      </EPreview>

      <EContainer>
        <ESection>
          <EImg
            src="https://nuxtemail.com/stripe-logo.png"
            width="49"
            height="21"
            alt="Stripe"
          />

          <EHr />

          <EText>
            Thanks for submitting your account information. You're now ready to
            make live transactions with Stripe!
          </EText>

          <EText>
            You can view your payments and a variety of other information about
            your account right from your dashboard.
          </EText>

          <EButton href="https://dashboard.stripe.com/login">
            View your Stripe Dashboard
          </EButton>

          <EHr />

          <EText>
            If you haven't finished your integration, you might find our
            <ELink href="https://docs.stripe.com/dashboard/basics">
              docs
            </ELink>
            handy.
          </EText>

          <EText>
            Once you're ready to start accepting payments, you'll just need to
            use your live
            <ELink href="https://dashboard.stripe.com/login?redirect=%2Fapikeys">
              >
              API keys
            </ELink>
            instead of your test API keys. Your account can simultaneously be
            used for both test and live requests, so you can continue testing
            while accepting live payments. Check out our
            <ELink href="https://docs.stripe.com/dashboard/basics">
              tutorial about account basics
            </ELink>
            .
          </EText>

          <EText>
            Finally, we've put together a
            <ELink href="https://docs.stripe.com/get-started/checklist/website">
              quick checklist
            </ELink>
            to ensure your website conforms to card network standards.
          </EText>

          <EText>
            We'll be here to help you with any step along the way. You can find
            answers to most questions and get in touch with us on our
            <ELink href="https://support.stripe.com">
              support site
            </ELink>
            .
          </EText>

          <EText>
            — The Stripe team
          </EText>

          <EHr />

          <EText>
            Stripe, 354 Oyster Point Blvd, South San Francisco, CA 94080
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
