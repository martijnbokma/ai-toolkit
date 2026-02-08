# Verifying Responsiveness

Verify that the user interface scales correctly across different viewports and identify any layout regressions or overflows.

## When

Use this skill when:
- The user asks to test a UI change on mobile or tablet.
- A new component is added that needs to be responsive.
- You want to check for horizontal scroll (overflow) on different screen sizes.
- Visual regressions are suspected after a CSS change.

## How

### 1. Prepare Viewports
Use the following standard sizes:
- **Mobile**: 360 × 800 (Android) / 390 × 844 (iPhone)
- **Tablet**: 768 × 1024 (iPad)
- **Desktop**: 1440 × 900 / 1920 × 1080

### 2. Automated Check
If the environment allows (e.g., Puppeteer, Playwright):
- Start the local dev server.
- Navigate to the target page.
- Emulate the viewports and take screenshots.
- **Overflow check**: Verify that `document.documentElement.scrollWidth <= window.innerWidth`.

### 3. Visual Inspection
- Check if elements stack correctly on mobile.
- Verify that text does not overflow its containers.
- Ensure that interactive elements (buttons, inputs) have enough space for touch targets on mobile.
- Confirm navigation menus collapse or adapt on smaller screens.

### 4. Reporting
Display findings per viewport and highlight specific elements that need improvement.

## What

Deliver the following results:
- **Scalability Confirmation**: A report on how the page behaves per breakpoint.
- **Overflow Detection**: List of elements causing horizontal scroll.
- **Screenshots**: (If possible) Visual evidence of the layout in different sizes.
- **Recommendations**: Concrete CSS/Tailwind suggestions to fix responsive issues.

## Key Rules
- **No Horizontal Scroll**: This is the most important rule for mobile viewports.
- **Mobile First**: Think from the smallest screen when proposing fixes.
- **Touch-friendly**: Ensure at least 44×44px touch targets.
- **Accessibility**: Ensure text remains readable at all viewport sizes.
