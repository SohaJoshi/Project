// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
  ComponentDialog,
  DialogSet,
  DialogTurnStatus,
  WaterfallDialog,
  TextPrompt,
} = require("botbuilder-dialogs");
const { LuisRecognizer } = require("botbuilder-ai");

const { CardFactory, MessageFactory, InputHints } = require("botbuilder");

const { QnAMakerBaseDialog } = require("./qnamakerBaseDialog");

const INITIAL_DIALOG = "initial-dialog";
const ROOT_DIALOG = "root-dialog";
const QNAMAKER_BASE_DIALOG = "qnamaker-base-dialog";

const MenuCard = require("../cards/menuCard.json");

//ingredients for pizza cards
const MargheritaCard = require("../cards/pizzaIngredients/margheritaCard.json");
const MarinaraCard = require("../cards/pizzaIngredients/marinaraCard.json");
const NapoliCard = require("../cards/pizzaIngredients/napoliCard.json");
const BufalaCard = require("../cards/pizzaIngredients/bufalaCard.json");
const ArmandoEScaranoCard = require("../cards/pizzaIngredients/armando&ScaranoCard.json");
const TEXT_PROMPT = "textPrompt";

class RootDialog extends ComponentDialog {
  /**
   * Root dialog for this bot.
   * @param {QnAMaker} qnaService A QnAMaker service object.
   */
  constructor(
    luisRecognizer,
    qnaService,
    orderPizzaDialog,
    bookingPlaceDialog,
    menuDialog
  ) {
    super(ROOT_DIALOG);
    // Initial waterfall dialog.
    if (!luisRecognizer)
      throw new Error(
        "[MainDialog]: Missing parameter 'luisRecognizer' is required"
      );
    this.luisRecognizer = luisRecognizer;

    if (!orderPizzaDialog)
      throw new Error(
        "[MainDialog]: Missing parameter 'orderPizzaDialog' is required"
      );
    if (!bookingPlaceDialog)
      throw new Error(
        "[MainDialog]: Missing parameter 'orderPizzaDialog' is required"
      );

    if (!menuDialog)
      throw new Error(
        "[MainDialog]: Missing parameter 'menuDialog' is required"
      );

    this.addDialog(new TextPrompt("TextPrompt"))
      .addDialog(orderPizzaDialog)
      .addDialog(bookingPlaceDialog)
      .addDialog(qnaService)
      .addDialog(new TextPrompt(TEXT_PROMPT))
      .addDialog(
        new WaterfallDialog(INITIAL_DIALOG, [
          this.introStep.bind(this),
          this.actStep.bind(this),
          this.finalStep.bind(this),
        ])
      );
    this.initialDialogId = INITIAL_DIALOG;
  }

  /**
   * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
   * If no dialog is active, it will start the default dialog.
   * @param {*} turnContext
   * @param {*} accessor
   */
  async run(context, accessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  // This is the first step of the WaterfallDialog.
  // It kicks off the dialog with the QnA Maker with provided options.
  async startInitialDialog(step) {
    return await step.beginDialog(QNAMAKER_BASE_DIALOG);
  }

  /**
     * First step in the waterfall dialog. Prompts the user for a command.

     */
  async introStep(stepContext) {
    if (!this.luisRecognizer.isConfigured) {
      const messageText =
        "NOTE: LUIS is not configured. To enable all capabilities, add `LuisAppId`, `LuisAPIKey` and `LuisAPIHostName` to the .env file.";
      await stepContext.context.sendActivity(
        messageText,
        null,
        InputHints.IgnoringInput
      );
    }
    const messageText = stepContext.options.restartMsg
      ? stepContext.options.restartMsg
      : 'Hi, my name is Armando, how can i help you?"';
    const promptMessage = MessageFactory.text(
      messageText,
      messageText,
      InputHints.ExpectingInput
    );
    return await stepContext.prompt("TextPrompt", { prompt: promptMessage });
  }

  /**
   * Second step in the waterfall.  This will use LUIS to attempt to extract the origin, destination and travel dates.
   * Then, it hands off to the OrderPizzaDialog child dialog to collect any remaining details.
   */
  async actStep(stepContext) {
    const orderDetails = {};
    const bookingPlaceDetails = {};

    if (!this.luisRecognizer.isConfigured) {
      // LUIS is not configured, we just run the OrderPizzaDialog path.
      return await stepContext.beginDialog("orderPizzaDialog", orderDetails);
    }

    // Call LUIS and gather any potential booking details. (Note the TurnContext has the response to the prompt)
    const luisResult = await this.luisRecognizer.executeLuisQuery(
      stepContext.context
    );

    //threshold about 20% of accuracy for use luis, otherwise it will use QnA service.
    switch (LuisRecognizer.topIntent(luisResult, "none", 0.3)) {
      case "OrderPizza": {
        orderDetails.date = this.luisRecognizer.getBookingDate(luisResult);
        orderDetails.number = this.luisRecognizer.getBookingPhone(luisResult);
        if (this.luisRecognizer.getTypeOfPizza(luisResult))
          orderDetails.text = this.luisRecognizer.getText(luisResult);
        console.log(
          "LUIS extracted these booking details:",
          JSON.stringify(orderDetails)
        );

        // Run the OrderPizzaDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
        return await stepContext.beginDialog("orderPizzaDialog", orderDetails);
      }
      case "RestaurantReservation_Reserve": {
        // Extract the values for the composite entities from the LUIS result.
        console.log(
          "LUIS extracted these booking details:",
          JSON.stringify(luisResult)
        );

        bookingPlaceDetails.name =
          this.luisRecognizer.getBookingName(luisResult);
        bookingPlaceDetails.number =
          this.luisRecognizer.getBookingPhone(luisResult);
        bookingPlaceDetails.numberOfPeople =
          this.luisRecognizer.getBookingNumberOfPeople(luisResult);
        bookingPlaceDetails.date =
          this.luisRecognizer.getBookingDate(luisResult);

        console.log(
          "LUIS extracted these booking details:",
          JSON.stringify(bookingPlaceDetails)
        );

        // Run the OrderPizzaDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
        return await stepContext.beginDialog(
          "bookingPlaceDialog",
          bookingPlaceDetails
        );
      }
      case "GetMenu": {
        // Initialize OrderDetails with any entities we may have found in the response.

        console.log("Get the menu");
        const menuCard = CardFactory.adaptiveCard(MenuCard);
        await stepContext.context.sendActivity({ attachments: [menuCard] });
        // Run the OrderPizzaDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
        break;
      }
      case "GetIngredients": {
        // Initialize BookingDetails with any entities we may have found in the response.

        console.log("Get the ingredients");

        const typeOfPizza = this.luisRecognizer.getTypeOfPizza(luisResult);
        console.log("LUIS extracted these booking details:", typeOfPizza);

        switch (typeOfPizza) {
          case "Margherita": {
            const margheritaCard = CardFactory.adaptiveCard(MargheritaCard);
            await stepContext.context.sendActivity({
              attachments: [margheritaCard],
            });
            break;
          }
          case "Marinara": {
            const marinaraCard = CardFactory.adaptiveCard(MarinaraCard);
            await stepContext.context.sendActivity({
              attachments: [marinaraCard],
            });
            break;
          }
          case "Napoli": {
            const napoliCard = CardFactory.adaptiveCard(NapoliCard);
            await stepContext.context.sendActivity({
              attachments: [napoliCard],
            });
            break;
          }
          case "Bufala": {
            const bufalaCard = CardFactory.adaptiveCard(BufalaCard);
            await stepContext.context.sendActivity({
              attachments: [bufalaCard],
            });
            break;
          }
          case "Armando&Scarano": {
            const armandoEScaranoCard =
              CardFactory.adaptiveCard(ArmandoEScaranoCard);
            await stepContext.context.sendActivity({
              attachments: [armandoEScaranoCard],
            });
            break;
          }
          default: {
            const getWeatherMessageText =
              "What kind of pizza are you talking about? Write menu for the list of pizzas we have.";
            await stepContext.context.sendActivity(
              getWeatherMessageText,
              getWeatherMessageText,
              InputHints.IgnoringInput
            );
          }
        }
        // Run the OrderPizzaDialog passing in whatever details we have from the LUIS call, it will fill out the remainder.
        break;
      }

      default: {
        // Catch all for unhandled intents
        return await stepContext.beginDialog(
          "qnamaker-base-dialog",
          QNAMAKER_BASE_DIALOG
        );
      }
    }

    return await stepContext.next();
  }

  /**
   * Shows a warning if the requested From or To cities are recognized as entities but they are not in the Airport entity list.
   * In some cases LUIS will recognize the From and To composite entities as a valid cities but the From and To Airport values
   * will be empty if those entity values can't be mapped to a canonical item in the Airport.
   */
  async showWarningForUnsupportedCities(context, fromEntities, toEntities) {
    const unsupportedCities = [];
    if (fromEntities.from && !fromEntities.airport) {
      unsupportedCities.push(fromEntities.from);
    }

    if (toEntities.to && !toEntities.airport) {
      unsupportedCities.push(toEntities.to);
    }

    if (unsupportedCities.length) {
      const messageText = `Sorry but the following airports are not supported: ${unsupportedCities.join(
        ", "
      )}`;
      await context.sendActivity(
        messageText,
        messageText,
        InputHints.IgnoringInput
      );
    }
  }

  /**
   * This is the final step in the main waterfall dialog.
   */
  async finalStep(stepContext) {
    // If the child dialog ("OrderPizzaDialog") was cancelled or the user failed to confirm, the Result here will be null.
    if (stepContext.result && stepContext?.result[0]?.score === undefined) {
      // Now we have all the booking details.

      // This is where calls to the booking AOU service or database would go.

      // If the call to the booking service was successful tell the user.
      console.log(stepContext.result);
      const msg = `You will be contacted shortly for confirmation.`;
      await stepContext.context.sendActivity(
        msg,
        msg,
        InputHints.IgnoringInput
      );
    }

    // Restart the main dialog with a different message the second time around
    return await stepContext.replaceDialog(this.initialDialogId, {
      restartMsg: "What can I do for you?",
    });
  }
}

module.exports.RootDialog = RootDialog;
