"use client";

import { useEffect, useCallback } from "react";
import { isMarketingAddonLive } from "@/lib/feature-flags";

// ─── Tour step definitions ────────────────────────────────────────────────────

const ALL_STEPS = [
  {
    element: "[data-tour='nav-dashboard']",
    popover: {
      title: "🏠 Dashboard",
      description: "Your command center. See occupancy rates, active leads, revenue, and recent activity across all your properties at a glance.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-properties']",
    popover: {
      title: "🏢 Properties",
      description: "Add each of your properties here. Every property gets a dedicated AI phone number — leads text it and LUB takes over instantly.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-leads']",
    popover: {
      title: "👤 Leads",
      description: "Every lead that contacts your property lands here. See their conversation, qualification score, and status. The AI handles outreach — you step in only when needed.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-automations']",
    popover: {
      title: "⚡ Automations",
      description: "Set your follow-up rules once. Configure how quickly the AI follows up when a lead doesn't reply — max 48 hours so no one slips through.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-calendar']",
    popover: {
      title: "📅 Calendar",
      description: "All your scheduled tours in one place. When the AI books a tour, it shows up here automatically.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-marketing']",
    popover: {
      title: "📣 Marketing",
      description: "With the Marketing Add-On, the AI generates Facebook and Google ad campaigns for your property. You review and approve before anything goes live.",
      side: "right" as const,
      align: "start" as const,
    },
    requiresMarketingAddon: true,
  },
  {
    element: "[data-tour='nav-insights']",
    popover: {
      title: "📊 Insights & Reports",
      description: "Deep analytics on lead conversion, AI performance, response times, and revenue attribution. Know exactly what LUB is generating for you.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-settings']",
    popover: {
      title: "⚙️ Settings",
      description: "Manage your account, upload a profile photo, configure billing, and set up integrations with Zapier, AppFolio, and more.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='nav-getting-started']",
    popover: {
      title: "🚀 Your Setup Checklist",
      description: "Come back here any time to see what's left to set up. Each step links directly to where you need to go. Follow it and you'll be live in under 10 minutes.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='copilot-btn']",
    popover: {
      title: "🤖 LUB Co-Pilot",
      description: "Stuck? Ask Co-Pilot anything — \"which property has the worst occupancy?\", \"draft a follow-up for a hot lead\", or \"what should I do to hit 95% occupancy?\". It knows your portfolio.",
      side: "left" as const,
      align: "end" as const,
    },
  },
];

// ─── PlatformTour ─────────────────────────────────────────────────────────────

const TOUR_COMPLETED_KEY = "lub_platform_tour_completed";

interface PlatformTourProps {
  onFinish: () => void;
  /** When true, runs even if the user previously completed/skipped. Used by 'Restart tour' button. */
  forceRun?: boolean;
}

export function PlatformTour({ onFinish, forceRun = false }: PlatformTourProps) {
  const startTour = useCallback(async () => {
    const { driver } = await import("driver.js");
    await import("driver.js/dist/driver.css");

    const driverObj = driver({
      showProgress:    true,
      animate:         true,
      overlayOpacity:  0.55,
      stagePadding:    6,
      stageRadius:     10,
      allowClose:      true,
      progressText:    "{{current}} of {{total}}",
      nextBtnText:     "Next →",
      prevBtnText:     "← Back",
      doneBtnText:     "Done ✓",
      onDestroyStarted: () => {
        // Mark as completed whether they finished or closed early — we'll let
        // them re-run via the 'Restart tour' button on getting-started.
        try { localStorage.setItem(TOUR_COMPLETED_KEY, "1"); } catch { /* ignore */ }
        driverObj.destroy();
        onFinish();
      },
      steps: ALL_STEPS
        .filter(s => isMarketingAddonLive() || !("requiresMarketingAddon" in s && s.requiresMarketingAddon))
        .map(({ element, popover }) => ({ element, popover })),
    });

    driverObj.drive();
  }, [onFinish]);

  useEffect(() => {
    // Skip if user already completed/skipped, unless explicitly told to re-run
    if (!forceRun) {
      try {
        if (localStorage.getItem(TOUR_COMPLETED_KEY) === "1") {
          onFinish();
          return;
        }
      } catch { /* ignore — fall through and run */ }
    }
    // Small delay so the DOM is fully painted before we start highlighting
    const t = setTimeout(startTour, 300);
    return () => clearTimeout(t);
  }, [startTour, forceRun, onFinish]);

  return null;
}

/** Clears the "completed" flag so the next render re-runs the tour. */
export function resetPlatformTour() {
  try { localStorage.removeItem(TOUR_COMPLETED_KEY); } catch { /* ignore */ }
}
