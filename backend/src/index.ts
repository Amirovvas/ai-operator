// env.ts обязан быть первым: он читает .env до того, как остальные модули
// (pg, jwt, google, gemini) обратятся к process.env
import "./config/env";
import createApi from "./createApi";

const server = createApi();

const port = Number(process.env.PORT) || 5000;
server.listen(port, () => {
  console.log(`Server is on ${port}`);
});
