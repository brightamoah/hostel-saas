<script setup lang="ts">
definePageMeta({ layout: "default" });

const features = [
  {
    id: "room",
    icon: "i-lucide-building-2",
    label: "Room Management",
    headline: "Every room, perfectly organized.",
    description: "Assign rooms, track occupancy, manage bed spaces, and handle transfers — all from a single view. No spreadsheets, no chaos.",
    details: ["Real-time occupancy status", "Room type & capacity tracking", "Transfer & swap requests", "Vacancy alerts"],
  },
  {
    id: "maintenance",
    icon: "i-lucide-wrench",
    label: "Maintenance Requests",
    headline: "Issues reported. Issues resolved.",
    description: "Students submit requests with photo or video evidence. Staff triage, assign, and resolve — with full status visibility on both ends.",
    details: ["Photo & video attachments", "Priority levels", "Staff assignment", "Status tracking"],
  },
  {
    id: "payments",
    icon: "i-lucide-credit-card",
    label: "Payments",
    headline: "Fee collection without friction.",
    description: "Accept hostel fees securely via Paystack. Automated receipts, payment history, and outstanding balance tracking built in.",
    details: ["Paystack integration", "Automated receipts", "Payment history", "Outstanding balance alerts"],
  },
  {
    id: "announcements",
    icon: "i-lucide-megaphone",
    label: "Announcements",
    headline: "Keep everyone in the loop.",
    description: "Post rich announcements to all students or specific floors and rooms. Important notices are never buried in a chat thread again.",
    details: ["Rich text editor", "Targeted broadcasts", "Pinned notices", "Read receipts"],
  },
  {
    id: "portal",
    icon: "i-lucide-user-circle",
    label: "Student Portal",
    headline: "A home for every student.",
    description: "Students access their room details, payment history, maintenance requests, and announcements from a clean, dedicated portal.",
    details: ["Room & booking info", "Payment history", "Request tracking", "Notification centre"],
  },
  {
    id: "admin",
    icon: "i-lucide-layout-dashboard",
    label: "Admin Dashboard",
    headline: "Full visibility. Full control.",
    description: "A command centre for hostel managers. Monitor everything from occupancy rates to pending maintenance across all floors at a glance.",
    details: ["Occupancy analytics", "Revenue overview", "Staff activity logs", "Export reports"],
  },
  {
    id: "visitors",
    icon: "i-lucide-users",
    label: "Visitor Management",
    headline: `Know who's on your premises.`,
    description: "Log visitor check-ins and check-outs, link visits to student hosts, and maintain a complete access record for security.",
    details: ["Check-in / check-out log", "Host student linking", "Visit history", "Access reports"],
  },
  {
    id: "complaints",
    icon: "i-lucide-message-square-warning",
    label: "Complaints",
    headline: "Every voice, heard and resolved.",
    description: "Students raise formal complaints confidentially. Admins review, respond, and close with a full audit trail kept for accountability.",
    details: ["Confidential submissions", "Admin review workflow", "Resolution tracking", "Audit trail"],
  },
];

const activeId = ref("room");
const activeFeature = computed(() => features.find(f => f.id === activeId.value)!);
</script>

<template>
  <div class="features-page">
    <!-- ── Hero ─────────────────────────────────────── -->
    <section class="hero">
      <p class="eyebrow">
        Platform Features
      </p>

      <h1 class="hero-title">
        Everything a hostel<br>needs to run well.
      </h1>

      <p class="hero-sub">
        One platform. Eight modules. Built for Nigerian student hostels.
      </p>
    </section>

    <!-- ── Feature grid ───────────────────────────── -->
    <section class="grid-section">
      <div class="feature-grid">
        <button
          v-for="f in features"
          :key="f.id"
          class="feature-card"
          :class="{ active: activeId === f.id }"
          @click="activeId = f.id"
        >
          <UIcon
            :name="f.icon"
            class="card-icon"
          />

          <span class="card-label">{{ f.label }}</span>

          <UIcon
            name="i-lucide-arrow-right"
            class="card-arrow"
          />
        </button>
      </div>
    </section>

    <!-- ── Feature detail ─────────────────────────── -->
    <section class="detail-section">
      <Transition
        name="fade"
        mode="out-in"
      >
        <div
          :key="activeFeature.id"
          class="detail-inner"
        >
          <div class="detail-left">
            <div class="detail-icon-wrap">
              <UIcon
                :name="activeFeature.icon"
                class="detail-icon"
              />
            </div>

            <p class="detail-label">
              {{ activeFeature.label }}
            </p>

            <h2 class="detail-headline">
              {{ activeFeature.headline }}
            </h2>

            <p class="detail-description">
              {{ activeFeature.description }}
            </p>
          </div>

          <div class="detail-right">
            <p class="detail-includes">
              What's included
            </p>

            <ul class="detail-list">
              <li
                v-for="item in activeFeature.details"
                :key="item"
                class="detail-item"
              >
                <UIcon
                  name="i-lucide-check"
                  class="check-icon"
                />
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </Transition>
    </section>

    <!-- ── CTA ───────────────────────────────────── -->
    <section class="cta-section">
      <div class="cta-inner">
        <h2 class="cta-title">
          Ready to simplify your hostel?
        </h2>

        <p class="cta-sub">
          Get started in minutes. No setup fees.
        </p>

        <div class="cta-actions">
          <UButton
            size="xl"
            color="neutral"
            variant="solid"
            label="Get started"
            trailing-icon="i-lucide-arrow-right"
          />

          <UButton
            size="xl"
            color="neutral"
            variant="outline"
            label="Book a demo"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── Tokens ───────────────────────────────────────── */
.features-page {
  --ink: #0d0d0d;
  --ink-muted: #6b7280;
  --surface: #ffffff;
  --surface-2: #f9f9f8;
  --surface-3: #f1f1ef;
  --border: #e5e5e3;
  --accent: #0d0d0d;
  --accent-fg: #ffffff;
  --radius: 14px;

  font-family: "DM Sans", "Helvetica Neue", sans-serif;
  background: var(--surface);
  color: var(--ink);
  min-height: 100vh;
}

/* ── Hero ─────────────────────────────────────────── */
.hero {
  max-width: 720px;
  margin: 0 auto;
  padding: 96px 24px 64px;
  text-align: center;
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 20px;
}

.hero-title {
  font-family: "DM Serif Display", Georgia, serif;
  font-size: clamp(2.4rem, 5vw, 3.75rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 20px;
}

.hero-sub {
  font-size: 1.05rem;
  color: var(--ink-muted);
  line-height: 1.6;
}

/* ── Feature grid ─────────────────────────────────── */
.grid-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px 56px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.feature-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: var(--radius);
  border: 1.5px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.18s;
  width: 100%;
}

.feature-card:hover {
  border-color: #bbb;
  background: var(--surface-2);
}

.feature-card.active {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--accent-fg);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.card-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.8;
}

.card-label {
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}

.card-arrow {
  width: 14px;
  height: 14px;
  opacity: 0;
  transition:
    opacity 0.15s,
    transform 0.15s;
  flex-shrink: 0;
}

.feature-card:hover .card-arrow,
.feature-card.active .card-arrow {
  opacity: 0.6;
  transform: translateX(2px);
}

/* ── Detail ───────────────────────────────────────── */
.detail-section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px 96px;
}

.detail-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: calc(var(--radius) * 1.5);
  padding: 52px;
}

@media (max-width: 700px) {
  .detail-inner {
    grid-template-columns: 1fr;
    padding: 32px 24px;
    gap: 32px;
  }
}

.detail-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--surface-3);
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.detail-icon {
  width: 20px;
  height: 20px;
  color: var(--ink);
}

.detail-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 10px;
}

.detail-headline {
  font-family: "DM Serif Display", Georgia, serif;
  font-size: clamp(1.5rem, 3vw, 2.1rem);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.015em;
  margin-bottom: 16px;
  color: var(--ink);
}

.detail-description {
  font-size: 0.975rem;
  color: var(--ink-muted);
  line-height: 1.7;
}

.detail-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.detail-includes {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 20px;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--ink);
}

.check-icon {
  width: 16px;
  height: 16px;
  color: var(--ink);
  flex-shrink: 0;
  background: var(--surface-3);
  border-radius: 50%;
  padding: 2px;
}

/* ── CTA ──────────────────────────────────────────── */
.cta-section {
  background: var(--surface-3);
  border-top: 1.5px solid var(--border);
}

.cta-inner {
  max-width: 600px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
}

.cta-title {
  font-family: "DM Serif Display", Georgia, serif;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
  color: var(--ink);
}

.cta-sub {
  color: var(--ink-muted);
  font-size: 1rem;
  margin-bottom: 32px;
}

.cta-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Transition ───────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
