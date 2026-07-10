-- Пользователь может отвязать свой Telegram
DROP POLICY IF EXISTS "Users delete own telegram identity" ON telegram_identities;
CREATE POLICY "Users delete own telegram identity"
  ON telegram_identities FOR DELETE
  USING (auth.uid() = user_id);
