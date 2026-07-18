/* LexusLight — Russian localized strings.
   Scope is intentionally narrow: just the stats-sheet labels and the About
   quote/lore text. Everything else on the page (links, "talk/act/flirt",
   "incidents"/"page views", the battle-menu chat lines in data-talk.js /
   data-spell.js / data-flirt.js) stays as-is in both languages — the chat
   lines especially are Russian internet slang that doesn't translate well,
   so they're left Russian-only on purpose regardless of device language. */
const LANG_RU = {
  stats: {
    species: 'Вид',
    hp: 'Хп',
    schizo: 'Шиза',
    risk: 'Азарт',
    success: 'Успех'
  },
  about: {
    quote: '«Хотите чуда? Чудите!»',
    paragraphs: [
      'В дальних краях, где щебечет редкая птица и туман устилает горные хребты, случилось чудо. Он явился с раскатом грома, с первыми лучами солнца, с лёгким утренним ветерком.',
      'Сладкий, как диковинный плод, пьянящий не соком, а знанием. Таинственный, как цветок папоротника, что раскрывается лишь перед теми, кто готов пожертвовать покоем ради чуда. Чистый помыслами, как родниковая вода, ещё не познавший уныния, зависти и злости. Он сам был первым и величайшим из чудес, которые ему предстояло увидеть.',
      'Когда он прибыл сюда, никто не знал его имени и не ждал его пришествия. Некогда явившись миру как чудо, теперь он сам искал чудеса — чтобы знать, что он не одинок.',
      'Но приближался решающий час, когда ему предстояло вмешаться в судьбу людей. Когда-то он не сомневался, что сумеет поступить правильно. Теперь же он не знал, что станет большим злом — позволить миру идти своим путём или попытаться спасти его.'
    ]
  }
};
