// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// index.js is used to setup and configure your bot

// Import required packages
const path = require("path");

// Note: Ensure you have a .env file and include QnAKnowledgeBaseId, QnAEndpointKey and QnAEndpointHostName.
const ENV_FILE = path.join(__dirname, ".env");
require("dotenv").config({ path: ENV_FILE });

const restify = require("restify");

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
  ConversationState,
  MemoryStorage,
  UserState,
} = require("botbuilder");

const { QnABotWithMSI } = require("./bots/QnABotWithMSI");
const { RootDialog } = require("./dialogs/rootDialog");
const { DialogAndWelcomeBot } = require("./bots/dialogAndWelcomeBot");
const { UserInputRecognizer } = require("./dialogs/userInputRecognizer");
const { QnAMakerBaseDialog } = require("./dialogs/qnamakerBaseDialog");

const ORDERPIZZA_DIALOG = "orderPizzaDialog";
const BOOKINGPLACE_DIALOG = "bookingPlaceDialog";
const MENU_DIALOG = "menuDialog";

// the bot's booking dialog
const { OrderPizzaDialog } = require("./dialogs/orderPizzaDialog");
const { BookingPlaceDialog } = require("./dialogs/bookingPlaceDialog");
const { MenuDialog } = require("./dialogs/menuDialog");

// Create adapter.
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.MicrosoftAppId,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword,
  MicrosoftAppType: process.env.MicrosoftAppType,
  MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
});

const botFrameworkAuthentication =
  createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
  // This check writes out errors to console log .vs. app insights.
  // NOTE: In production environment, you should consider logging this to Azure
  //       application insights. See https://aka.ms/bottelemetry for telemetry
  //       configuration instructions.
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  console.error(error);

  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  // Send a message to the user
  await context.sendActivity("The bot encountered an error or bug.");
  await context.sendActivity(
    "To continue to run this bot, please fix the bot source code."
  );
};

// Define the state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state storage system to persist the dialog and user state between messages.
const memoryStorage = new MemoryStorage();

// Create conversation and user state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

let qnaServiceType = "qnAMaker";
if (
  process.env.LanguageEndpointKey &&
  process.env.LanguageEndpointHostName &&
  process.env.ProjectName
) {
  qnaServiceType = "language";
}

const qnaService = new QnAMakerBaseDialog(
  process.env.ProjectName || process.env.QnAKnowledgebaseId,
  process.env.LanguageEndpointKey || process.env.QnAEndpointKey,
  process.env.LanguageEndpointHostName || process.env.QnAEndpointHostName,
  qnaServiceType,
  process.env.DefaultAnswer,
  process.env.EnablePreciseAnswer?.toLowerCase(),
  process.env.DisplayPreciseAnswerOnly?.toLowerCase()
);

const { LuisAppId, LuisAPIKey, LuisAPIHostName } = process.env;
const luisConfig = {
  applicationId: LuisAppId,
  endpointKey: LuisAPIKey,
  endpoint: `https://${LuisAPIHostName}`,
};

const luisRecognizer = new UserInputRecognizer(luisConfig);
// Create the main dialog.
const orderPizzaDialog = new OrderPizzaDialog(ORDERPIZZA_DIALOG);
const bookingPlaceDialog = new BookingPlaceDialog(BOOKINGPLACE_DIALOG);
const menuDialog = new OrderPizzaDialog(MENU_DIALOG);

// Create the main dialog.
const dialog = new RootDialog(
  luisRecognizer,
  qnaService,
  orderPizzaDialog,
  bookingPlaceDialog,
  menuDialog
);

// Create the bot's main handler.
const bot = new QnABotWithMSI(conversationState, userState, dialog);

// Create HTTP server.
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log(`\n${server.name} listening to ${server.url}.`);
  console.log(
    "\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator"
  );
  console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Listen for incoming requests.
server.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (turnContext) => {
    // Route the message to the bot's main handler.
    await bot.run(turnContext);
  });
});

// SIG // Begin signature block
// SIG // MIIrYQYJKoZIhvcNAQcCoIIrUjCCK04CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // jFSN3gat8kqqkadUkcEG9Z8EYpQcpqbYqgzCs/f/NYug
// SIG // ghF5MIIIiTCCB3GgAwIBAgITNgAAAX7/b/0EpCVYEgAC
// SIG // AAABfjANBgkqhkiG9w0BAQsFADBBMRMwEQYKCZImiZPy
// SIG // LGQBGRYDR0JMMRMwEQYKCZImiZPyLGQBGRYDQU1FMRUw
// SIG // EwYDVQQDEwxBTUUgQ1MgQ0EgMDEwHhcNMjEwOTA5MDEy
// SIG // NjI2WhcNMjIwOTA5MDEyNjI2WjAkMSIwIAYDVQQDExlN
// SIG // aWNyb3NvZnQgQXp1cmUgQ29kZSBTaWduMIIBIjANBgkq
// SIG // hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkIdczHOhlavX
// SIG // 8oArJKfzvYOo0tIpSd4nZs/tiZBPvQGqzNAIidfwg0BE
// SIG // 0l+eiTofVZvJHX343aiXw9jaEldpTtXigBShEysoiSr2
// SIG // 3Ft/B+yYR9YfsggY2o4lssHAGf4qUV97DGDOZ15efhsR
// SIG // GaRkGyyLKy49uGYvXY9pHR3NA8am3ps5Qskogfp/axxX
// SIG // YvcxJ+l87k3/94ulzN+pVD2fsbemXJLqbtAgJ7uHWa9V
// SIG // 4sB72yb6qt0XFzlOY6dZvwCpODr/vY2hCjp2IhyW56Qv
// SIG // rysf2b/GmWo4T8lWN312/7coBjsm+tOxGJ+xdr+AHCS+
// SIG // aHD009wRlrb3tSrjsEUbNwIDAQABo4IFlTCCBZEwKQYJ
// SIG // KwYBBAGCNxUKBBwwGjAMBgorBgEEAYI3WwEBMAoGCCsG
// SIG // AQUFBwMDMD0GCSsGAQQBgjcVBwQwMC4GJisGAQQBgjcV
// SIG // CIaQ4w2E1bR4hPGLPoWb3RbOnRKBYIPdzWaGlIwyAgFk
// SIG // AgEMMIICdgYIKwYBBQUHAQEEggJoMIICZDBiBggrBgEF
// SIG // BQcwAoZWaHR0cDovL2NybC5taWNyb3NvZnQuY29tL3Br
// SIG // aWluZnJhL0NlcnRzL0JZMlBLSUNTQ0EwMS5BTUUuR0JM
// SIG // X0FNRSUyMENTJTIwQ0ElMjAwMSgyKS5jcnQwUgYIKwYB
// SIG // BQUHMAKGRmh0dHA6Ly9jcmwxLmFtZS5nYmwvYWlhL0JZ
// SIG // MlBLSUNTQ0EwMS5BTUUuR0JMX0FNRSUyMENTJTIwQ0El
// SIG // MjAwMSgyKS5jcnQwUgYIKwYBBQUHMAKGRmh0dHA6Ly9j
// SIG // cmwyLmFtZS5nYmwvYWlhL0JZMlBLSUNTQ0EwMS5BTUUu
// SIG // R0JMX0FNRSUyMENTJTIwQ0ElMjAwMSgyKS5jcnQwUgYI
// SIG // KwYBBQUHMAKGRmh0dHA6Ly9jcmwzLmFtZS5nYmwvYWlh
// SIG // L0JZMlBLSUNTQ0EwMS5BTUUuR0JMX0FNRSUyMENTJTIw
// SIG // Q0ElMjAwMSgyKS5jcnQwUgYIKwYBBQUHMAKGRmh0dHA6
// SIG // Ly9jcmw0LmFtZS5nYmwvYWlhL0JZMlBLSUNTQ0EwMS5B
// SIG // TUUuR0JMX0FNRSUyMENTJTIwQ0ElMjAwMSgyKS5jcnQw
// SIG // ga0GCCsGAQUFBzAChoGgbGRhcDovLy9DTj1BTUUlMjBD
// SIG // UyUyMENBJTIwMDEsQ049QUlBLENOPVB1YmxpYyUyMEtl
// SIG // eSUyMFNlcnZpY2VzLENOPVNlcnZpY2VzLENOPUNvbmZp
// SIG // Z3VyYXRpb24sREM9QU1FLERDPUdCTD9jQUNlcnRpZmlj
// SIG // YXRlP2Jhc2U/b2JqZWN0Q2xhc3M9Y2VydGlmaWNhdGlv
// SIG // bkF1dGhvcml0eTAdBgNVHQ4EFgQUbnzITVXlsHgMhs3R
// SIG // W8ZMWvMtVowwDgYDVR0PAQH/BAQDAgeAMFAGA1UdEQRJ
// SIG // MEekRTBDMSkwJwYDVQQLEyBNaWNyb3NvZnQgT3BlcmF0
// SIG // aW9ucyBQdWVydG8gUmljbzEWMBQGA1UEBRMNMjM2MTY3
// SIG // KzQ2Nzk3NDCCAeYGA1UdHwSCAd0wggHZMIIB1aCCAdGg
// SIG // ggHNhj9odHRwOi8vY3JsLm1pY3Jvc29mdC5jb20vcGtp
// SIG // aW5mcmEvQ1JML0FNRSUyMENTJTIwQ0ElMjAwMSgyKS5j
// SIG // cmyGMWh0dHA6Ly9jcmwxLmFtZS5nYmwvY3JsL0FNRSUy
// SIG // MENTJTIwQ0ElMjAwMSgyKS5jcmyGMWh0dHA6Ly9jcmwy
// SIG // LmFtZS5nYmwvY3JsL0FNRSUyMENTJTIwQ0ElMjAwMSgy
// SIG // KS5jcmyGMWh0dHA6Ly9jcmwzLmFtZS5nYmwvY3JsL0FN
// SIG // RSUyMENTJTIwQ0ElMjAwMSgyKS5jcmyGMWh0dHA6Ly9j
// SIG // cmw0LmFtZS5nYmwvY3JsL0FNRSUyMENTJTIwQ0ElMjAw
// SIG // MSgyKS5jcmyGgb1sZGFwOi8vL0NOPUFNRSUyMENTJTIw
// SIG // Q0ElMjAwMSgyKSxDTj1CWTJQS0lDU0NBMDEsQ049Q0RQ
// SIG // LENOPVB1YmxpYyUyMEtleSUyMFNlcnZpY2VzLENOPVNl
// SIG // cnZpY2VzLENOPUNvbmZpZ3VyYXRpb24sREM9QU1FLERD
// SIG // PUdCTD9jZXJ0aWZpY2F0ZVJldm9jYXRpb25MaXN0P2Jh
// SIG // c2U/b2JqZWN0Q2xhc3M9Y1JMRGlzdHJpYnV0aW9uUG9p
// SIG // bnQwHwYDVR0jBBgwFoAUllGE4Gtve/7YBqvD8oXmKa5q
// SIG // +dQwHwYDVR0lBBgwFgYKKwYBBAGCN1sBAQYIKwYBBQUH
// SIG // AwMwDQYJKoZIhvcNAQELBQADggEBAFNUZq2bELWmMfHQ
// SIG // bvcwusOE1xLbpndztAKz+1tAqO5zRQg07/KcajjNm8/6
// SIG // R+PQ13Z83Fwk41I3IqNN1fkDzt0JfMTjKpvGxPSnKH/n
// SIG // z5OA8g2OcvmM8UMpOPVEZ+Hmt1oYoQCZIP8ZxS4ip21l
// SIG // vIsqsYnvgeOLvXT327Fq8XIHnc0px9Gl8HyLdvSCgqRh
// SIG // y++KwQ2yh13S9KRI3/XNmAOjoktSB+1/7LgYxBWuCxGD
// SIG // 00hStgCV6YDO6vXZkr7WuAsrnUaGH9QVzykfgszU/Vy+
// SIG // WSV/C1LguS62YG7ey845VvtVJqNjrJlDt2AO/7Obx+k6
// SIG // nOrmfYrCMLIrdF36Lh0wggjoMIIG0KADAgECAhMfAAAA
// SIG // UeqP9pxzDKg7AAAAAABRMA0GCSqGSIb3DQEBCwUAMDwx
// SIG // EzARBgoJkiaJk/IsZAEZFgNHQkwxEzARBgoJkiaJk/Is
// SIG // ZAEZFgNBTUUxEDAOBgNVBAMTB2FtZXJvb3QwHhcNMjEw
// SIG // NTIxMTg0NDE0WhcNMjYwNTIxMTg1NDE0WjBBMRMwEQYK
// SIG // CZImiZPyLGQBGRYDR0JMMRMwEQYKCZImiZPyLGQBGRYD
// SIG // QU1FMRUwEwYDVQQDEwxBTUUgQ1MgQ0EgMDEwggEiMA0G
// SIG // CSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDJmlIJfQGe
// SIG // jVbXKpcyFPoFSUllalrinfEV6JMc7i+bZDoL9rNHnHDG
// SIG // fJgeuRIYO1LY/1f4oMTrhXbSaYRCS5vGc8145WcTZG90
// SIG // 8bGDCWr4GFLc411WxA+Pv2rteAcz0eHMH36qTQ8L0o3X
// SIG // Ob2n+x7KJFLokXV1s6pF/WlSXsUBXGaCIIWBXyEchv+s
// SIG // M9eKDsUOLdLTITHYJQNWkiryMSEbxqdQUTVZjEz6eLRL
// SIG // kofDAo8pXirIYOgM770CYOiZrcKHK7lYOVblx22pdNaw
// SIG // Y8Te6a2dfoCaWV1QUuazg5VHiC4p/6fksgEILptOKhx9
// SIG // c+iapiNhMrHsAYx9pUtppeaFAgMBAAGjggTcMIIE2DAS
// SIG // BgkrBgEEAYI3FQEEBQIDAgACMCMGCSsGAQQBgjcVAgQW
// SIG // BBQSaCRCIUfL1Gu+Mc8gpMALI38/RzAdBgNVHQ4EFgQU
// SIG // llGE4Gtve/7YBqvD8oXmKa5q+dQwggEEBgNVHSUEgfww
// SIG // gfkGBysGAQUCAwUGCCsGAQUFBwMBBggrBgEFBQcDAgYK
// SIG // KwYBBAGCNxQCAQYJKwYBBAGCNxUGBgorBgEEAYI3CgMM
// SIG // BgkrBgEEAYI3FQYGCCsGAQUFBwMJBggrBgEFBQgCAgYK
// SIG // KwYBBAGCN0ABAQYLKwYBBAGCNwoDBAEGCisGAQQBgjcK
// SIG // AwQGCSsGAQQBgjcVBQYKKwYBBAGCNxQCAgYKKwYBBAGC
// SIG // NxQCAwYIKwYBBQUHAwMGCisGAQQBgjdbAQEGCisGAQQB
// SIG // gjdbAgEGCisGAQQBgjdbAwEGCisGAQQBgjdbBQEGCisG
// SIG // AQQBgjdbBAEGCisGAQQBgjdbBAIwGQYJKwYBBAGCNxQC
// SIG // BAweCgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGGMBIGA1Ud
// SIG // EwEB/wQIMAYBAf8CAQAwHwYDVR0jBBgwFoAUKV5RXmSu
// SIG // NLnrrJwNp4x1AdEJCygwggFoBgNVHR8EggFfMIIBWzCC
// SIG // AVegggFToIIBT4YxaHR0cDovL2NybC5taWNyb3NvZnQu
// SIG // Y29tL3BraWluZnJhL2NybC9hbWVyb290LmNybIYjaHR0
// SIG // cDovL2NybDIuYW1lLmdibC9jcmwvYW1lcm9vdC5jcmyG
// SIG // I2h0dHA6Ly9jcmwzLmFtZS5nYmwvY3JsL2FtZXJvb3Qu
// SIG // Y3JshiNodHRwOi8vY3JsMS5hbWUuZ2JsL2NybC9hbWVy
// SIG // b290LmNybIaBqmxkYXA6Ly8vQ049YW1lcm9vdCxDTj1B
// SIG // TUVSb290LENOPUNEUCxDTj1QdWJsaWMlMjBLZXklMjBT
// SIG // ZXJ2aWNlcyxDTj1TZXJ2aWNlcyxDTj1Db25maWd1cmF0
// SIG // aW9uLERDPUFNRSxEQz1HQkw/Y2VydGlmaWNhdGVSZXZv
// SIG // Y2F0aW9uTGlzdD9iYXNlP29iamVjdENsYXNzPWNSTERp
// SIG // c3RyaWJ1dGlvblBvaW50MIIBqwYIKwYBBQUHAQEEggGd
// SIG // MIIBmTBHBggrBgEFBQcwAoY7aHR0cDovL2NybC5taWNy
// SIG // b3NvZnQuY29tL3BraWluZnJhL2NlcnRzL0FNRVJvb3Rf
// SIG // YW1lcm9vdC5jcnQwNwYIKwYBBQUHMAKGK2h0dHA6Ly9j
// SIG // cmwyLmFtZS5nYmwvYWlhL0FNRVJvb3RfYW1lcm9vdC5j
// SIG // cnQwNwYIKwYBBQUHMAKGK2h0dHA6Ly9jcmwzLmFtZS5n
// SIG // YmwvYWlhL0FNRVJvb3RfYW1lcm9vdC5jcnQwNwYIKwYB
// SIG // BQUHMAKGK2h0dHA6Ly9jcmwxLmFtZS5nYmwvYWlhL0FN
// SIG // RVJvb3RfYW1lcm9vdC5jcnQwgaIGCCsGAQUFBzAChoGV
// SIG // bGRhcDovLy9DTj1hbWVyb290LENOPUFJQSxDTj1QdWJs
// SIG // aWMlMjBLZXklMjBTZXJ2aWNlcyxDTj1TZXJ2aWNlcyxD
// SIG // Tj1Db25maWd1cmF0aW9uLERDPUFNRSxEQz1HQkw/Y0FD
// SIG // ZXJ0aWZpY2F0ZT9iYXNlP29iamVjdENsYXNzPWNlcnRp
// SIG // ZmljYXRpb25BdXRob3JpdHkwDQYJKoZIhvcNAQELBQAD
// SIG // ggIBAFAQI7dPD+jfXtGt3vJp2pyzA/HUu8hjKaRpM3op
// SIG // ya5G3ocprRd7vdTHb8BDfRN+AD0YEmeDB5HKQoG6xHPI
// SIG // 5TXuIi5sm/LeADbV3C2q0HQOygS/VT+m1W7a/752hMIn
// SIG // +L4ZuyxVeSBpfwf7oQ4YSZPh6+ngZvBHgfBaVz4O9/wc
// SIG // fw91QDZnTgK9zAh9yRKKls2bziPEnxeOZMVNaxyV0v15
// SIG // 2PY2xjqIafIkUjK6vY9LtVFjJXenVUAmn3WCPWNFC1YT
// SIG // IIHw/mD2cTfPy7QA1pT+GPARAKt0bKtq9aCd/Ym0b5tP
// SIG // bpgCiRtzyb7fbNS1dE740re0COE67YV2wbeo2sXixzvL
// SIG // ftH8L7s9xv9wV+G22qyKt6lmKLjFK1yMw4Ni5fMabcgm
// SIG // zRvSjAcbqgp3tk4a8emaaH0rz8MuuIP+yrxtREPXSqL/
// SIG // C5bzMzsikuDW9xH10graZzSmPjilzpRfRdu20/9UQmC7
// SIG // eVPZ4j1WNa1oqPHfzET3ChIzJ6Q9G3NPCB+7KwX0OQmK
// SIG // yv7IDimj8U/GlsHD1z+EF/fYMf8YXG15LamaOAohsw/y
// SIG // wO6SYSreVW+5Y0mzJutnBC9Cm9ozj1+/4kqksrlhZgR/
// SIG // CSxhFH3BTweH8gP2FEISRtShDZbuYymynY1un+RyfiK9
// SIG // +iVTLdD1h/SxyxDpZMtimb4CgJQlMYIZQDCCGTwCAQEw
// SIG // WDBBMRMwEQYKCZImiZPyLGQBGRYDR0JMMRMwEQYKCZIm
// SIG // iZPyLGQBGRYDQU1FMRUwEwYDVQQDEwxBTUUgQ1MgQ0Eg
// SIG // MDECEzYAAAF+/2/9BKQlWBIAAgAAAX4wDQYJYIZIAWUD
// SIG // BAIBBQCgga4wGQYJKoZIhvcNAQkDMQwGCisGAQQBgjcC
// SIG // AQQwHAYKKwYBBAGCNwIBCzEOMAwGCisGAQQBgjcCARUw
// SIG // LwYJKoZIhvcNAQkEMSIEIG91EGi1ZB2sKr6cZGClnoD2
// SIG // a9WMH05a7BeaGkvYFg8iMEIGCisGAQQBgjcCAQwxNDAy
// SIG // oBSAEgBNAGkAYwByAG8AcwBvAGYAdKEagBhodHRwOi8v
// SIG // d3d3Lm1pY3Jvc29mdC5jb20wDQYJKoZIhvcNAQEBBQAE
// SIG // ggEAErEgLcoF/ieyZH7dBAp46wt0C/8UTkGKk9/3CO8t
// SIG // aTENjie5AsoVR5g4X6RDol59ntJrN5+2LYySfNr+E+5T
// SIG // 4GDVlVxYcmqUYqyO8hDN55PkjBeibIWeiK4ax6xolrYC
// SIG // ad4s60MPsFBgyOq8audcE1O5Caijqk/RSs9o141y0OPP
// SIG // T23SH4aBArkOha4px7Bx8YMTzQYHrRD4C8+wMdgfAMil
// SIG // a2gTMqgUioHM/fAGN7RY4QBeipjhw96dbuiuQGRuRhKU
// SIG // 6dTGfPuB/Z4ORrT1IQrnBcWKy4eG6YdRac4FDCawuTQT
// SIG // SRm61V7DuYrNIMTNQktNhkwVg8e16oTAMIvF/6GCFwgw
// SIG // ghcEBgorBgEEAYI3AwMBMYIW9DCCFvAGCSqGSIb3DQEH
// SIG // AqCCFuEwghbdAgEDMQ8wDQYJYIZIAWUDBAIBBQAwggFU
// SIG // BgsqhkiG9w0BCRABBKCCAUMEggE/MIIBOwIBAQYKKwYB
// SIG // BAGEWQoDATAxMA0GCWCGSAFlAwQCAQUABCAwFKof3jkN
// SIG // eUtlxgxJ3Ae49WmIlmQRFD7/xXvLft8OLwIGYrIVrHjV
// SIG // GBIyMDIyMDcyMjAzMjk0My43NVowBIACAfSggdSkgdEw
// SIG // gc4xCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
// SIG // dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
// SIG // aWNyb3NvZnQgQ29ycG9yYXRpb24xKTAnBgNVBAsTIE1p
// SIG // Y3Jvc29mdCBPcGVyYXRpb25zIFB1ZXJ0byBSaWNvMSYw
// SIG // JAYDVQQLEx1UaGFsZXMgVFNTIEVTTjpEOURFLUUzOUEt
// SIG // NDNGRTElMCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3Rh
// SIG // bXAgU2VydmljZaCCEVwwggcQMIIE+KADAgECAhMzAAAB
// SIG // rGa8hyJd3j17AAEAAAGsMA0GCSqGSIb3DQEBCwUAMHwx
// SIG // CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9u
// SIG // MRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jv
// SIG // c29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMB4XDTIyMDMw
// SIG // MjE4NTEyOVoXDTIzMDUxMTE4NTEyOVowgc4xCzAJBgNV
// SIG // BAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYD
// SIG // VQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQg
// SIG // Q29ycG9yYXRpb24xKTAnBgNVBAsTIE1pY3Jvc29mdCBP
// SIG // cGVyYXRpb25zIFB1ZXJ0byBSaWNvMSYwJAYDVQQLEx1U
// SIG // aGFsZXMgVFNTIEVTTjpEOURFLUUzOUEtNDNGRTElMCMG
// SIG // A1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vydmlj
// SIG // ZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIB
// SIG // AMd4C1DFF2Lux3HMK8AElMdTF4iG9ROyKQWFehTXe+EX
// SIG // 1QOrTBFnhMAKNHIQWoxkK1W62/oQQQmtIHo8sphMt1Wp
// SIG // kLNvCm3La8sdVL3t/BAx7UWkmfvujJ3KDaSgt3clc5uN
// SIG // PUj7e32U4n/Ep9oOc+Pv/EHc7XGH1fGRvLRYzwoxP1xk
// SIG // KleusbIzT/aKn6WC2BggPzjHXin9KE7kriCuqA+JNhsk
// SIG // kedTHJQIotblR+rZcsexTSmjO+Z7R0mfeHiU8DntvZvZ
// SIG // /9ad9XUhDwUJFKZ8ZZvxnqnZXwFYkDKNagY8g06BF1vD
// SIG // ulblAs6A4huP1e7ptKFppB1VZkLUAmIW1xxJGs3keidA
// SIG // TWIVx22sGVyemaT29NftDp/jRsDw/ahwv1Nkv6Wvykov
// SIG // K0kDPIY9TCW9cRbvUeElk++CVM7cIqrl8QY3mgEQ8oi4
// SIG // 5VzEBXuY04Y1KijbGLYRFNUypXMRDApV+kcjG8uST13m
// SIG // SCf2iMhWRRLz9/jyIwe7lmXz4zUyYckr+2Nm8GrSq5fV
// SIG // APshIO8Ab/aOo6/oe3G3Y+cil8iyRJLJNxbMYxiQJKZv
// SIG // bxlCIp+pGInaD1373M7KPPF/yXeT4hG0LqXKvelkgtlp
// SIG // zefPrmUVupjYTgeGfupUwFzymSk4JRNO1thRB0bDKDIy
// SIG // NMVqEuvV1UxdcricV0ojgeJHAgMBAAGjggE2MIIBMjAd
// SIG // BgNVHQ4EFgQUWBGfdwTLH0BnSjx8SVqYWsBAjk0wHwYD
// SIG // VR0jBBgwFoAUn6cVXQBeYl2D9OXSZacbUzUZ6XIwXwYD
// SIG // VR0fBFgwVjBUoFKgUIZOaHR0cDovL3d3dy5taWNyb3Nv
// SIG // ZnQuY29tL3BraW9wcy9jcmwvTWljcm9zb2Z0JTIwVGlt
// SIG // ZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3JsMGwGCCsG
// SIG // AQUFBwEBBGAwXjBcBggrBgEFBQcwAoZQaHR0cDovL3d3
// SIG // dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNy
// SIG // b3NvZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAxMCgx
// SIG // KS5jcnQwDAYDVR0TAQH/BAIwADATBgNVHSUEDDAKBggr
// SIG // BgEFBQcDCDANBgkqhkiG9w0BAQsFAAOCAgEAedC1AlhV
// SIG // XHCldk8toIzAW9QyITcReyhUps1uD67zCC308fRzYFES
// SIG // /2vMX7o0ObJgzCxT1ni0vkcs8WG2MUIsk91RCPIeDzTQ
// SIG // ItIpj9ZTz9h0tufcKGm3ahknRs1hoV12jRFkcaqXJo1f
// SIG // syuoKgD+FTT2lOvrEsNjJh5wEsi+PB/mVmh/Ja0Vu8jh
// SIG // UJc1hrBUQ5YisQ4N00snZwhOoCePXbdD6HGs1cmsXZbr
// SIG // kT8vNPYV8LnI4lxuJ/YaYS20qQr6Y9DIHFDNYxZbTlsQ
// SIG // eXs/KjnhRNdFiCGoAcLHWweWeRszh2iUhMfY1/79d7so
// SIG // mfjx6ZyJPZOr4fE0UT2l/rBaBTroPpDOvpaOsY6E/teL
// SIG // LMfynr6UOQeE4lRiw59siVGyAGqpTBTbdzAFLBFH40ub
// SIG // r7VEldmjiHa14EkZxYvcgzKxKqub4yrKafo/j9aUbwLr
// SIG // L2VMHWcpa18Jhv6zIjd01IGkUdj3UJ+JKQNAz5eyPyQS
// SIG // ZPt9ws8bynodGlM5nYkHBy7rPvj45y+Zz7jrLgjgvZIi
// SIG // xGszwqKyKJ47APHxrH8GjCQusbvW9NF4LAYKoZZGj7Pw
// SIG // mQA+XmwD5tfUQ0KuzMRFmMpOUztiTAgJjQf9TMuc3pYm
// SIG // pFWEr8ksYdwrjrdWYALCXA/IQXEdAisQwj5YzTsh4QxT
// SIG // Uq+vRSxs93yB3nIwggdxMIIFWaADAgECAhMzAAAAFcXn
// SIG // a54Cm0mZAAAAAAAVMA0GCSqGSIb3DQEBCwUAMIGIMQsw
// SIG // CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQ
// SIG // MA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMTIwMAYDVQQDEylNaWNyb3Nv
// SIG // ZnQgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkgMjAx
// SIG // MDAeFw0yMTA5MzAxODIyMjVaFw0zMDA5MzAxODMyMjVa
// SIG // MHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
// SIG // dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
// SIG // aWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1p
// SIG // Y3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMIICIjAN
// SIG // BgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA5OGmTOe0
// SIG // ciELeaLL1yR5vQ7VgtP97pwHB9KpbE51yMo1V/YBf2xK
// SIG // 4OK9uT4XYDP/XE/HZveVU3Fa4n5KWv64NmeFRiMMtY0T
// SIG // z3cywBAY6GB9alKDRLemjkZrBxTzxXb1hlDcwUTIcVxR
// SIG // MTegCjhuje3XD9gmU3w5YQJ6xKr9cmmvHaus9ja+NSZk
// SIG // 2pg7uhp7M62AW36MEBydUv626GIl3GoPz130/o5Tz9bs
// SIG // hVZN7928jaTjkY+yOSxRnOlwaQ3KNi1wjjHINSi947SH
// SIG // JMPgyY9+tVSP3PoFVZhtaDuaRr3tpK56KTesy+uDRedG
// SIG // bsoy1cCGMFxPLOJiss254o2I5JasAUq7vnGpF1tnYN74
// SIG // kpEeHT39IM9zfUGaRnXNxF803RKJ1v2lIH1+/NmeRd+2
// SIG // ci/bfV+AutuqfjbsNkz2K26oElHovwUDo9Fzpk03dJQc
// SIG // NIIP8BDyt0cY7afomXw/TNuvXsLz1dhzPUNOwTM5TI4C
// SIG // vEJoLhDqhFFG4tG9ahhaYQFzymeiXtcodgLiMxhy16cg
// SIG // 8ML6EgrXY28MyTZki1ugpoMhXV8wdJGUlNi5UPkLiWHz
// SIG // NgY1GIRH29wb0f2y1BzFa/ZcUlFdEtsluq9QBXpsxREd
// SIG // cu+N+VLEhReTwDwV2xo3xwgVGD94q0W29R6HXtqPnhZy
// SIG // acaue7e3PmriLq0CAwEAAaOCAd0wggHZMBIGCSsGAQQB
// SIG // gjcVAQQFAgMBAAEwIwYJKwYBBAGCNxUCBBYEFCqnUv5k
// SIG // xJq+gpE8RjUpzxD/LwTuMB0GA1UdDgQWBBSfpxVdAF5i
// SIG // XYP05dJlpxtTNRnpcjBcBgNVHSAEVTBTMFEGDCsGAQQB
// SIG // gjdMg30BATBBMD8GCCsGAQUFBwIBFjNodHRwOi8vd3d3
// SIG // Lm1pY3Jvc29mdC5jb20vcGtpb3BzL0RvY3MvUmVwb3Np
// SIG // dG9yeS5odG0wEwYDVR0lBAwwCgYIKwYBBQUHAwgwGQYJ
// SIG // KwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYDVR0PBAQD
// SIG // AgGGMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAU
// SIG // 1fZWy4/oolxiaNE9lJBb186aGMQwVgYDVR0fBE8wTTBL
// SIG // oEmgR4ZFaHR0cDovL2NybC5taWNyb3NvZnQuY29tL3Br
// SIG // aS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0XzIwMTAt
// SIG // MDYtMjMuY3JsMFoGCCsGAQUFBwEBBE4wTDBKBggrBgEF
// SIG // BQcwAoY+aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3Br
// SIG // aS9jZXJ0cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5j
// SIG // cnQwDQYJKoZIhvcNAQELBQADggIBAJ1VffwqreEsH2cB
// SIG // MSRb4Z5yS/ypb+pcFLY+TkdkeLEGk5c9MTO1OdfCcTY/
// SIG // 2mRsfNB1OW27DzHkwo/7bNGhlBgi7ulmZzpTTd2YurYe
// SIG // eNg2LpypglYAA7AFvonoaeC6Ce5732pvvinLbtg/SHUB
// SIG // 2RjebYIM9W0jVOR4U3UkV7ndn/OOPcbzaN9l9qRWqveV
// SIG // tihVJ9AkvUCgvxm2EhIRXT0n4ECWOKz3+SmJw7wXsFSF
// SIG // QrP8DJ6LGYnn8AtqgcKBGUIZUnWKNsIdw2FzLixre24/
// SIG // LAl4FOmRsqlb30mjdAy87JGA0j3mSj5mO0+7hvoyGtmW
// SIG // 9I/2kQH2zsZ0/fZMcm8Qq3UwxTSwethQ/gpY3UA8x1Rt
// SIG // nWN0SCyxTkctwRQEcb9k+SS+c23Kjgm9swFXSVRk2XPX
// SIG // fx5bRAGOWhmRaw2fpCjcZxkoJLo4S5pu+yFUa2pFEUep
// SIG // 8beuyOiJXk+d0tBMdrVXVAmxaQFEfnyhYWxz/gq77EFm
// SIG // PWn9y8FBSX5+k77L+DvktxW/tM4+pTFRhLy/AsGConsX
// SIG // HRWJjXD+57XQKBqJC4822rpM+Zv/Cuk0+CQ1ZyvgDbjm
// SIG // jJnW4SLq8CdCPSWU5nR0W2rRnj7tfqAxM328y+l7vzhw
// SIG // RNGQ8cirOoo6CGJ/2XBjU02N7oJtpQUQwXEGahC0HVUz
// SIG // WLOhcGbyoYICzzCCAjgCAQEwgfyhgdSkgdEwgc4xCzAJ
// SIG // BgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAw
// SIG // DgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
// SIG // ZnQgQ29ycG9yYXRpb24xKTAnBgNVBAsTIE1pY3Jvc29m
// SIG // dCBPcGVyYXRpb25zIFB1ZXJ0byBSaWNvMSYwJAYDVQQL
// SIG // Ex1UaGFsZXMgVFNTIEVTTjpEOURFLUUzOUEtNDNGRTEl
// SIG // MCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vy
// SIG // dmljZaIjCgEBMAcGBSsOAwIaAxUAsRrSE7C4sEn96AMh
// SIG // jNkXZ0Y1iqCggYMwgYCkfjB8MQswCQYDVQQGEwJVUzET
// SIG // MBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVk
// SIG // bW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0
// SIG // aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFt
// SIG // cCBQQ0EgMjAxMDANBgkqhkiG9w0BAQUFAAIFAOaEH7ww
// SIG // IhgPMjAyMjA3MjEyMjU1NTZaGA8yMDIyMDcyMjIyNTU1
// SIG // NlowdDA6BgorBgEEAYRZCgQBMSwwKjAKAgUA5oQfvAIB
// SIG // ADAHAgEAAgINNDAHAgEAAgIRRDAKAgUA5oVxPAIBADA2
// SIG // BgorBgEEAYRZCgQCMSgwJjAMBgorBgEEAYRZCgMCoAow
// SIG // CAIBAAIDB6EgoQowCAIBAAIDAYagMA0GCSqGSIb3DQEB
// SIG // BQUAA4GBALwl1eHJJv1hvInGGntcggOg8x8srUd4IS9+
// SIG // rEkBPgcfSUa0/ma4KmTuZZ91yRkuOjthuo/oKqPmS+M9
// SIG // f0PNoxNy72xz4llzqbabYQ3+uIqSwKD95hwqByIFgkKV
// SIG // 5D7pRfEgqyceCar+Js7LKH0uCEU1acEh1VCiwzN4dcs0
// SIG // rJdeMYIEDTCCBAkCAQEwgZMwfDELMAkGA1UEBhMCVVMx
// SIG // EzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1Jl
// SIG // ZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3Jh
// SIG // dGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3Rh
// SIG // bXAgUENBIDIwMTACEzMAAAGsZryHIl3ePXsAAQAAAaww
// SIG // DQYJYIZIAWUDBAIBBQCgggFKMBoGCSqGSIb3DQEJAzEN
// SIG // BgsqhkiG9w0BCRABBDAvBgkqhkiG9w0BCQQxIgQgZhYi
// SIG // N6d/SiKLWmITNRfxOhM6OnqbfPsYjEdR1QFDTyowgfoG
// SIG // CyqGSIb3DQEJEAIvMYHqMIHnMIHkMIG9BCD5twGSgzgv
// SIG // CXEAcrVz56m79Pp+bQJf+0+Lg2faBCzC9TCBmDCBgKR+
// SIG // MHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
// SIG // dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
// SIG // aWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1p
// SIG // Y3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwAhMzAAAB
// SIG // rGa8hyJd3j17AAEAAAGsMCIEIJzmTutOA9q5hQ2oF9Zr
// SIG // QovGty6h+4eWuP8vifDg/HzDMA0GCSqGSIb3DQEBCwUA
// SIG // BIICAHQGxBzBQZidKtwQvv6b3rDhUXj7SX6D4/7jaaoq
// SIG // p0sKJ4SkuyxgkTnKY4EkhgMLeW2+21Wkru0UsoSDJg/+
// SIG // 3cj75zYqdjpf5czmQ+hmhA1Aksdnx8kGCU8a8SLcdmXO
// SIG // 875vGVPhjoKI6CS7X+5v/JUohnSwvbO86NZ+LwY+eGrR
// SIG // kiuork29Lawg3rWqhsP4e4sGFMuQPZuIfttwTCfsk/ne
// SIG // h/WjLWdZgEU3Wv5EwKbhnsMkG6Cyrig2jNSrGtSItCS5
// SIG // ajRnKLj602AN1wH08LPi9PMInAEY4940J/twpcORbGcb
// SIG // gIv5nWhH7tprCXP9h6LnDJvUQsb3L52tUQJnXeutrEi2
// SIG // cNQX5CasRAykCtAV6NP7RBCi/cvOI0JtjQo63ruRWTvK
// SIG // TIlyuURf8Qnr10dul7MYqnRUfgbM8MQ2s0TozAFJtlFa
// SIG // R8v5w5SqC6h1SBIKCN+hxY8vVuPjiaCk7YkO24WY8GYR
// SIG // zG3jegEzb9KhWb7jOYnQsqgsslYzUMKCKsXoo30GZ45I
// SIG // 8KUGbSkW1KHAuUOAIzgfMVZrb2Y/PohcKY3HN2NbSjdn
// SIG // Gy75PCthABzuVVUe2N7sQQvD8gV55agMfsG1CMMhtRKy
// SIG // 7u96eOn4hpefLO8rYeCVf39eOmar5mGCrCQv3T8hU3xR
// SIG // hM67ygyWA05BQPrsgFJ4SVyBAaBb
// SIG // End signature block
