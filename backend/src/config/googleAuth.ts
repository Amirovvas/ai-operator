import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "../plugins/pg";
import "../config/googleAuth";
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const google_id = profile.id;
        const email = profile.emails?.[0]?.value;
        // photos[0] приходит только при scope "profile"; _json.picture — запасной путь
        const avatar = profile.photos?.[0]?.value || profile._json?.picture || null;
        const name = profile.displayName;

        // google has in db?
        const googleExist = await pool.query(
          `
        select * from users
        where google_id = $1
        `,
          [google_id],
        );
        if (googleExist.rows[0]) {
          //! updated tokens + свежее фото профиля в БД
          // (фото могло смениться в Google или быть пустым с прошлого входа)
          const updatedUser = await pool.query(
            `
          update users
          set google_refresh = coalesce($1, google_refresh),
              google_access = $2,
              avatar = coalesce($3, avatar)
          where google_id = $4
          returning *
          `,
            [refreshToken || null, accessToken, avatar, google_id],
          );
          return done(null, updatedUser.rows[0]);
        }

        // email has in db?
        const EmailExist = await pool.query(
          `
        select * from users
        where email = $1
        `,
          [email],
        );
        if (EmailExist.rows[0]) {
          // привязываем Google к существующему аккаунту — вместе с токенами,
          // иначе Gmail/Calendar/Drive у такого пользователя не заработают
          const updatedUser = await pool.query(
            `update users
          set avatar = coalesce($1, avatar), google_id = $2, name = $3,
              google_refresh = coalesce($4, google_refresh), google_access = $5
        where id = $6
        returning *
        `,
            [
              avatar,
              google_id,
              name,
              refreshToken || null,
              accessToken,
              EmailExist.rows[0].id,
            ],
          );
          return done(null, updatedUser.rows[0]);
        }
        // create account
        const newUser = await pool.query(
          `
      insert into users (name, avatar, email, google_id, google_refresh, google_access)
      values ($1, $2, $3, $4, $5, $6)
        returning *
        `,
          [name, avatar, email, google_id, refreshToken || null, accessToken],
        );
        done(null, newUser.rows[0]);
      } catch (error) {
        // без этого ошибка БД внутри async-колбэка становилась unhandled
        // rejection, а запрос входа через Google просто зависал
        done(error as Error);
      }
    },
  ),
);
