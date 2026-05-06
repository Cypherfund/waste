You are a senior Flutter UI engineer and design system expert.

I have an existing Flutter app with working backend integration.
DO NOT change business logic, API calls, or navigation flow.

Your task is ONLY to refactor and improve the UI to match the provided mockup exactly.

------------------------------------
INPUT
------------------------------------
- Attached: UI mockup image (reference design)
- Existing Flutter code already implemented

------------------------------------
GOAL
------------------------------------
Make the app UI match the mockup in:

1. Layout (spacing, alignment, padding)
2. Typography (font size, weight, hierarchy)
3. Colors (green theme, background tones)
4. Components (cards, buttons, inputs)
5. Visual hierarchy (important elements stand out)
6. Consistency across all screens

------------------------------------
RULES
------------------------------------

1. DO NOT modify:
   - API logic
   - Controllers / state management
   - Navigation structure

2. ONLY update:
   - Widgets
   - Styling
   - Layout structure

3. Replace existing UI with reusable components:
   - PrimaryButton
   - AppCard
   - SectionHeader
   - InputField
   - BottomCTA

------------------------------------
SPECIFIC UI REQUIREMENTS
------------------------------------

- Use rounded cards (borderRadius: 12–16)
- Add consistent padding (16–20)
- Use soft shadows for elevation
- Use primary green color (#2E7D32)
- Buttons should be full-width with strong CTA
- Add spacing between sections (min 16px)
- Improve empty states with illustrations
- Add progress indicators in onboarding

------------------------------------
TASKS
------------------------------------

1. Analyze the mockup and identify UI differences
2. Refactor each screen to match the design
3. Extract reusable UI components
4. Improve responsiveness (small & large devices)
5. Ensure pixel-level alignment as close as possible

------------------------------------
OUTPUT
------------------------------------

- Updated Flutter UI code (clean and modular)
- List of changes made per screen
- New reusable widget components

Focus on making the UI production-grade and visually polished.

Use the following design system:

Spacing scale:
- small: 8
- medium: 16
- large: 24

Border radius:
- cards: 16
- buttons: 12

Colors:
- primary: #2E7D32
- background: #F7F9F7
- textPrimary: #1C1C1C
- textSecondary: #6B6B6B

Typography:
- Title: 20–24 bold
- Subtitle: 16 medium
- Body: 14 regular