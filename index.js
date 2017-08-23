var DBHandler = require("./DBHandler")

var APP_ID = '';

exports.handler = (event, context, callback) => {
    try {
        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
        }

        var request = event.request;

        if (request.type === "LaunchRequest") {
            context.succeed(buildResponse({
                speechText: "Welcome to home remedy. Please tell me what is the problem you want remedy for?",
                repromptText: "You can say for example, home remedy for headache",
                endSession: false
            }));
        }
        else if (request.type === "IntentRequest") {
            let options = {};

            if (request.intent.name === "RemedyIntent") {

                if (request.intent.slots.problem !== undefined)
                    var problem = request.intent.slots.problem.value;
                console.log('Problem is ' + problem)

                if (problem === undefined || problem === null) {
                    options.speechText = " hmmm you have forgotten to tell your problem . Please tell me your problem so that I can try to find a home remedy for you."
                    options.repromptText = "Please tell your problem. You can tell, for example, home remedy for hiccups, or you can simply say hiccups . If you want to quit you can say stop or cancel."
                    options.endSession = false;
                    context.succeed(buildResponse(options));
                    return;
                }



                DBHandler.getSolutionForProblem(problem, function (err, data) {
                    if (err) {
                        context.fail(err);

                    } else {

                        if (data.Item !== undefined) {

                            var smallImageUrl = '';
                            var largeImageUrl = '';
                            var finalMessage = '';

                            if (data.Item.Category === 'medical') {
                                smallImageUrl = "https://s3.amazonaws.com/myfortunezodiacsign/HomeMedicalRemedyCardSmall.jpg"
                                largeImageUrl = "https://s3.amazonaws.com/myfortunezodiacsign/HomeMedicalRemedyCardLarge.jpg"
                                finalMessage = " <break time='1s' />Get well soon. I have send remedies to your Alexa app as well. Thank you for using home remedy . I will always be here to help you."
                            } else {
                                smallImageUrl = "https://s3.amazonaws.com/myfortunezodiacsign/HomeRemedyGeneralCardSmall.png"
                                largeImageUrl = "https://s3.amazonaws.com/myfortunezodiacsign/HomeRemedyGeneralCardLarge.png"
                                finalMessage = " <break time='1s' /> I have send remedies to your Alexa app as well. Thank you for using home remedy . I will always be here to help you."
                            }


                            if (data.Item.Level === 'Major' && data.Item.Category === 'medical') {
                                options.cardTitle = `Immediate Medical Attension Required`
                                options.cardResponse = `You need immediate  medical attension for ${problem} as ${problem} is not a minor issue which you can sort out at home. \n\nPlease contact medical emergency as soon as possible.`
                                options.cardSmallImage = smallImageUrl,
                                    options.cardLargeImage = largeImageUrl,
                                    options.speechText = `<prosody volume="x-loud"><prosody pitch="+5%">IMMEDIATE ATTENSION REQUIRED. ${problem} is not something which can cure by home remedy, as it is a major issue, which you need medical attension immediately. Please contact medical emergency as soon as possible.</prosody></prosody>`
                                options.endSession = true;
                                context.succeed(buildResponse(options));
                                return;
                            }


                            var remedies = data.Item.Remedies.values;
                            var length = remedies.length;



                            if (length === 1) {
                                let remedey = `${remedies[0]} .${finalMessage}. <break time='1s' />${data.Item.AdviceMessage}`;                               
                                options.speechText = `I have found, one home remedy for ${problem} .`
                                options.speechText += `<break time='1s' /> ${remedey} .`
                                options.cardTitle = `Home Remedy for ${problem}`
                                options.cardResponse = `Remedy for ${problem},\n${remedies[0]}.`
                                options.cardSmallImage = smallImageUrl,
                                    options.cardLargeImage = largeImageUrl,
                                    options.endSession = true;
                                context.succeed(buildResponse(options));

                            } else {
                                let count = 1;
                                let tempData = '';
                                let cardText = `I have found, ${length} home remedies for ${problem},\n`;
                                options.speechText = `I have found, ${length} home remedies for ${problem} .`

                                remedies.forEach(function (remedy) {
                                    tempData += `<break time='1s' /> Remedy ${count} <break time='1s' /> ${remedy} .`
                                    cardText += `Remedy ${count}- ${remedy} \n `
                                    count++;
                                });

                                if (data.Item.Reason) {
                                    tempData += `<break time='500ms'/> ${data.Item.Reason} .`
                                }

                                tempData += `<break time='500ms'/>${data.Item.AdviceMessage}`
                                tempData += finalMessage;
                                options.speechText += tempData
                                options.cardTitle = `Home Remedies for ${problem}`
                                options.cardResponse = cardText;
                                options.cardSmallImage = smallImageUrl,
                                    options.cardLargeImage = largeImageUrl,
                                    options.endSession = true;
                                context.succeed(buildResponse(options));
                            }
                        } else {
                            options.speechText = `I am Sorry, I couldn't find remedy for ${problem} now. I am still learning more. I may be able to help you next time. `
                            options.endSession = true;
                            context.succeed(buildResponse(options));
                        }
                    }

                    callback(null, data)
                });



            } else if (request.intent.name === "AMAZON.StopIntent" || request.intent.name === "AMAZON.CancelIntent") {
                options.speechText = "ok, thanks for using home remedy.";
                options.endSession = true;
                context.succeed(buildResponse(options));
            }
            else if (request.intent.name === "AMAZON.HelpIntent") {
                options.speechText = "Home remedy will help you to find remedies for most of the common health problems, which you can try at home. To find remedy for a problem you can say, for example, Ask home remedy for hiccups.";
                options.repromptText = "What is the problem you want remedy for? If you want to exit from home remedy skill, please say stop or cancel."
                options.endSession = false;
                context.succeed(buildResponse(options));
            }
            else {
                context.fail("Unknown Intent")
            }
        }

        else if (request.type === "SessionEndedRequest") {
            options.endSession = true;
            context.succeed();
        }
        else {
            context.fail("Unknown Intent type")
        }



    } catch (e) {

    }


};


function buildResponse(options) {
    var response = {
        version: "1.0",
        response: {
            outputSpeech: {
                "type": "SSML",
                "ssml": `<speak><prosody rate="slow">${options.speechText}</prosody></speak>`
            },

            shouldEndSession: options.endSession
        }
    };

    if (options.repromptText) {
        response.response.reprompt = {
            outputSpeech: {
                "type": "SSML",
                "ssml": `<speak><prosody rate="slow">${options.repromptText}</prosody></speak>`
            }
        };
    }
    if (options.cardResponse) {
        response.response.card = {
            "type": "Standard",
            "title": options.cardTitle,
            "text": options.cardResponse,
        }
        response.response.card.image = {
            "smallImageUrl": options.cardSmallImage,
            "largeImageUrl": options.cardLargeImage
        }
    }
    return response;
}
