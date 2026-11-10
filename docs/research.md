# Research summary (2026-11-07)

Short version of three research passes. Anything marked "unverified" was seen only in secondary sources.

## 1. What hooks players and makes them replay

- **No tutorial; playing within seconds.** Homa's rules: players should understand the mechanic "from the very first seconds" and each level should take 40 seconds or less. https://hubspot.academy.homagames.com/15-golden-rules-of-hyper-casual-games
- **Microgames are a proven format.** Nintendo describes WarioWare microgames as "only about five seconds long". https://iwataasks.nintendo.com/interviews/ds/diy/0/0
- **Retention benchmarks are low; don't promise more.**
  - Voodoo's prototype bar is 45% D1 and 13% D7. https://www.gameanalytics.com/blog/how-voodoo-diversified-and-lowered-game-product-kpis
  - GameAnalytics 2024: top-quartile D1 of about 27% and median D7 of about 3.5–4%. https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
- **Near-miss is the strongest replay urge, but use it carefully.** Candy Crush study: near-misses drove the urge to keep playing more than wins. https://link.springer.com/article/10.1007/s10899-016-9633-7 We show "you were close" honestly and add no fake near-misses.
- **Streaks work.**
  - Duolingo: learners on a 7-day streak are 2.4× more likely to return the next day. https://blog.duolingo.com/improving-the-streak
  - Holding 2 streak freezes raised daily active learners by 0.38%. https://blog.duolingo.com/how-duolingo-streak-builds-habit/
- **A daily shared seed plus a spoiler-free grid is the best-documented share loop.** Wordle went from about 90 players to over 300,000 in two months after the emoji grid launched. https://www.nytimes.com/2022/01/03/technology/wordle-word-game-creator.html (confirmed via https://en.wikipedia.org/wiki/Wordle)

## 2. TikTok and Reels sharing, and web limits

- **TikTok's creative guidance:** hook in the first 3 seconds, 9:16 at 720p or higher, keep text inside safe zones. https://ads.tiktok.com/help/article/creative-best-practices
- **Android in-app browsers (WebViews) lack `navigator.share`.** Always fall back to copy-link and save-image. https://groups.google.com/a/chromium.org/g/blink-dev/c/s22QQi9Fa0E
- **Recording video:** MediaRecorder writes MP4/H.264 on iOS 14.5+ and works in Chrome. Recording inside the TikTok and Instagram in-app browsers is unverified, so feature-detect it. https://caniuse.com/mediarecorder
- **Vibration:** `navigator.vibrate` works on Android Chrome but not on iOS Safari. https://caniuse.com/vibration
- **Haptics guidance:** short taps of 10–20 ms, synced with visuals and sound. Prefer none over buzzy. https://developer.android.com/develop/ui/views/haptics/haptics-principles
- **Game feel:** "Juice it or Lose it" (Jonasson and Purho) and "The Art of Screenshake" (Nijman). https://gdcvault.com/play/1016487/

## 3. What we can honestly say about focus

- **People get better at the trained task. Improvement in general attention, IQ, school or work is not supported.**
  - Owen et al. 2010, doi:10.1038/nature09042
  - Simons et al. 2016, doi:10.1177/1529100616661983
  - Sala et al. 2019, doi:10.1525/collabra.203
  - Gobet & Sala 2023, doi:10.1177/17456916221091830
- **Inhibition (go/no-go) training improves the trained task but did not transfer** in a double-blind RCT. Enge et al. 2014, doi:10.1037/a0036165
- **Notifications:** one lab study found that an unanswered notification still disrupted an attention task (Stothart et al. 2015, doi:10.1037/xhp0000100). The "brain drain" effect of a phone just being nearby did not replicate reliably (Ruiz Pardo & Minda 2022, doi:10.1016/j.actpsy.2022.103717).
- **Regulators act on this.**
  - FTC v. Lumos Labs: $2M settlement over claims about performance at work and school, cognitive decline and ADHD. https://www.ftc.gov/news-events/news/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program
  - UK ASA rulings against memory and ADHD claims in games, for example https://www.asa.org.uk/rulings/gmrd-apps-ltd-a23-1215012-gmrd-apps-ltd.html

**Claims we will use:**
- "A daily focus challenge."
- "Practice gets you better at this game."
- "Test how well you ignore distractions, today."
- "Track your scores and beat your best."
- "A game for fun, not a medical test."

**Claims we will never use:**
- "Improves your attention span"
- "Trains your focus for real life"
- "Rewires your brain"
- "Clinically proven" or "science-backed"
- "Helps ADHD"
- "Reverses brain rot"
- "Notifications drain your brain"

## 4. Monetization

- **Game subscriptions convert poorly** (RevenueCat 2026): median 1.0% download to paid and median price $4.99 a month. Revenue per payer is low ($8.41 after month 1). https://www.revenuecat.com/state-of-subscription-apps-2026-gaming
- **An archive of past puzzles is a proven paid perk.** NYT locked the Wordle archive behind its subscription. https://techcrunch.com/2024/05/07/nyt-games-launches-a-wordle-archive-with-access-to-more-than-1000-past-puzzles/
- **Web shops are now normal.** Playtika earns more than 25% of its revenue on the web (RevenueCat link above).
- **Dodo Payments facts (checked in its docs):**
  - Checkout: `POST /checkouts`.
  - Webhooks follow Standard Webhooks with HMAC-SHA256, signed in `webhook-id`, `webhook-timestamp` and `webhook-signature`.
  - Event names: `payment.succeeded`, `refund.succeeded`, `subscription.active`.
  - Separate test and live keys. India payouts are supported.
  - Fees: about 4% + 40¢, plus 1.5% for buyers outside the US.
  - Docs: https://docs.dodopayments.com/developer-resources/checkout-session.md and https://docs.dodopayments.com/developer-resources/webhooks.md
- **Blocker:** Dodo's Merchant Acceptance Policy lists "online games, video games… digital item sales" as unsupported, while a Dodo blog post pitches to game studios. Written approval is needed. https://docs.dodopayments.com/miscellaneous/merchant-acceptance

## 5. Children, teens, and the law

- **COPPA (US):**
  - Mixed-audience sites may use a neutral age screen: ask for a birth date, don't default to 13+, collect nothing before the screen.
  - Persistent identifiers count as personal information.
  - The internal-operations exception covers saving scores and preferences, but not profiling or ads.
  - https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
  - The 2025 amendments require compliance by 22 April 2026: a written retention policy and separate consent for third-party disclosure. https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
- **UK Children's Code:**
  - High privacy by default, profiling and geolocation off.
  - No nudge techniques; the ICO names streaks as a reward loop.
  - The ICO began reviewing mobile games in December 2025.
  - https://www.hunton.com/privacy-and-cybersecurity-law-blog/uk-ico-launches-review-of-childrens-privacy-in-mobile-gaming
- **GDPR Article 8:** the digital consent age is 13–16 depending on the country (unverified per country).
- **EU Kids Act:** proposed on 17 September 2026 and not yet law. It targets "reward tricks", including streaks, for minors. https://commission.europa.eu/news-and-media/news/eu-kids-act-helping-children-navigate-safer-online-world-2026-09-17_en
- **Purchases by minors:**
  - Contracts with minors are voidable in the UK and US.
  - Epic paid $245M in refunds for dark patterns that let kids buy without consent. https://www.ftc.gov/news-events/news/press-releases/2022/12/fortnite-video-game-maker-epic-games-pay-more-half-billion-dollars-over-ftc-allegations

**Design rule we follow:**
- Play is anonymous with no trackers.
- A neutral age question appears only before paying or saving a nickname.
- Under-13s get the full game but no purchases and no nickname.
- Under-18 purchases go through a parent.
- Streaks have free grace days, we never sell streak repairs, and we send no loss-framed reminders.

---

# Round 2 research (2026-11-07, after "it's boring" feedback)

Items marked [unverified] come from secondary or vendor sources.

## 6. Mascots and characters
- **Tone, not species, decides "kids" vs "Gen Z".**
  - Duolingo's cute owl became a Gen Z brand through an "unhinged" voice. The CEO pushed the social team to be "more unhinged", and the team now measures new users, not impressions. https://www.thedrum.com/news/2025/02/25/duolingo-s-tiktok-mastermind-its-unhinged-social-strategy-and-killing-its-mascot
  - The "Duo is dead" campaign took mentions from about 11k to about 60k a day. https://www.meltwater.com/en/blog/duolingo-dead-mascot-campaign
- **Collectible absurd characters carried 2025's biggest breakout.**
  - Steal a Brainrot, a game about collecting meme characters, hit 25.4M concurrent players. https://www.pocketgamer.biz/robloxs-steal-a-brainrot-becomes-first-game-to-surpass-25m-concurrent-players/
  - Italian brainrot characters are AI-made and have faced blasphemy complaints, a brand-safety risk. https://knowyourmeme.com/memes/tralalero-tralala
- **A roster of loud, distinct characters drove Brawl Stars** and Supercell's record $3B year in 2024. https://mobilegamer.biz/squad-busters-disappoints-but-brawl-stars-soars-in-record-year-for-supercell/
- **Roblox:** 274M avatar updates a day, and 84% of Gen Z users who customize take style cues from their avatars. https://www.businesswire.com/news/home/20251216215439/en/Roblox-Releases-New-Data-Decoding-Search-and-Style-Trends-in-Digital-Experiences
- **Selling characters:** sell them directly, never in random boxes.
  - From June 2026, PEGI rates games with paid random items 16+, and limited-time or limited-quantity offers 12+. https://www.videogameschronicle.com/news/all-games-with-loot-boxes-in-them-will-be-rated-minimum-pegi-16-starting-this-summer
  - Fortnite's direct-purchase skins cost about $6.50–16. https://frvr.com/blog/news/fortnite-cheapest-skin-release/

## 7. How games like this make money
- **WarioWare and Rhythm Heaven are one-time premium games.** Rhythm Heaven Groove passed 1M boxed copies in Japan. https://www.nintendolife.com/news/2026/09/japanese-charts-rhythm-heaven-groove-surpasses-1-million-boxed-units-sold
- **Brain Test makes money from ads plus hints**, estimated at about $1M+ a month, 70% from ads [unverified]. https://appgoblin.info/apps/com.unicostudio.braintest
- **NYT Games keeps the daily free and sells the archive and extras**, at about $50 a year. https://www.niemanlab.org/2025/09/the-new-york-times-launches-a-family-subscription-with-separate-wordles-for-everyone/
- **Hyper-casual games sell "Remove ads" for $2.99–3.99.** In one Voodoo game it was 11.7% of revenue. https://www.gamigion.com/?p=22577
- **Few players pay.** Mobile payer conversion is usually under 5% (https://www.appsflyer.com/resources/reports/gaming-app-marketing-2024-report/); older benchmarks put the median at about 0.4% (https://www.gamerefinery.com/5-key-takeaways-from-gameanalytics-h1-2019-mobile-benchmarks-report/). **Plan for 0.5–2% on the web.**
- **Payers decide early:** about 50% of payers make their first purchase within 3 days (AppsFlyer, link above).
- **What regulators treat as dark patterns:**
  - FTC v. Epic: no-confirmation purchases. https://www.ftc.gov/node/80648
  - EU consumer authorities' principles on virtual currencies: show real-money prices and don't hide costs. https://commission.europa.eu/document/download/8af13e88-6540-436c-b137-9853e7fe866a_en?filename=Key+principles+on+in-game+virtual+currencies.pdf
  - UK ASA: no direct urging of children to buy. https://www.asa.org.uk/static/4028c436-5861-4035-8d98c148d3c66b7e/Guidance-on-advertising-in-game-purchases.pdf
- **Web ads pay modestly.**
  - Rewarded video on the web earns about $3.62 eCPM globally and $6.98 in the US [vendor, unverified]. https://www.applixir.com/?p=4289
  - Google turns off ad personalization for users under 18. https://support.google.com/adspolicy/answer/12189264?hl=en
  - Ads only pay at scale, so we hold off until there are about 5k daily players.

## 8. What makes it replayable (Gen Z, ethically)
- **Run length:** the median mobile session is about 5–6 minutes (https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks). Aim for 60–150 second runs and 3–4 runs per session.
- **Rhythm within a run:** WarioWare builds up, puts a boss every few microgames, then speeds up. https://www.mariowiki.com/WarioWare_Gold
- **Clash Royale's double elixir** gives each match a late climax. https://www.gamedeveloper.com/business/deconstructing-clash-royale
- **Modes should differ in fail rules, seeds and social framing, not just speed.**
  - WarioWare: Thrilling is one life, and Super Hard is extreme speed (link above).
  - Hades' Pact of Punishment lets players tune their own difficulty. https://www.tomsguide.com/features/hades-exclusive-interview-supergiant
  - Keep the mode list short and in one place. Clash Royale lost players when it put a mode somewhere separate. https://mobilegamer.biz/supercell-explains-clash-royales-big-comeback/
- **Duolingo's retention data:**
  - Leaderboards raised learning time 17% and tripled highly engaged learners. https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth
  - Friend streaks make learners 22% more likely to finish the daily lesson. https://blog.duolingo.com/friend-streak-social-feature/
- **Competence and autonomy predict continued play** (self-determination theory): personal bests, mastery, and choice of mode. https://link.springer.com/content/pdf/10.1007%2Fs11031-006-9051-8.pdf
- **Ethics:**
  - Honest near-miss ("2 short of your best") is fine. Rigged outcomes are not.
  - 12 of 13 studies tie loot boxes to problem gambling. https://www.open-access.bcu.ac.uk/14466/1/Spicer_Loot_Boxes_Problem_Gambling_2021.pdf
  - The UK ICO asks for natural stopping points and break prompts. https://ico.org.uk/for-organisations/childrens-code-hub/top-tips-for-games-designers-how-to-comply-with-the-children-s-code
- **Async "race my ghost" links are a proven format.** https://www.pocketgamer.com/real-racing-3/real-racing-3s-asynchronous-multiplayer-turns-ghosts-into-ai-competitors
