
// Import stuff
var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');

// Custom imports
var credentials = require('./credentials.json');
var dialogue = require('./dialogue.json');

// Constants
const COMMAND_PREFIX = "thrawn";
const LISTENER_PASSWORD = credentials.password;

const STATUSES = dialogue.STATUSES;
const FILLER_WORDS = dialogue.FILLER_WORDS;
const QUOTES = dialogue.QUOTES;

// Random variables
var listeners = [];
var repeaters = [];
var storedChannelIDs = [];

var filter = null;

listeners.push(credentials.report_to);

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
})

logger.level = 'debug';

// Initialize discord bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function (e) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')')

    bot.setPresence({
        game: { name: randomArrayElement(STATUSES) }
    });
});

bot.on('message', function (user, userID, channelID, message, e) {

    var args = message.split(' ');

    if (args[0] == COMMAND_PREFIX)
    {
        var cmd = args[1];
        
        logger.info('Recieved Command ' + message);
        
        args = args.splice(2);

        // bot.deleteMessage({
        //     channelID: channelID,
        //     messageID: e.d.id
        // });
        
        switch (cmd)
        {
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'I am here.'
                });
                break;
            
            case 'echo':
                
                var msg = "";
                
                for (var i = 0; i < args.length; i++)
                {
                    msg += args[i];
                    msg += (i == args.length - 1) ? "" : " ";
                }
                
                bot.sendMessage({
                    to: channelID,
                    message: msg
                });
                
                break;
            
            case 'addlistener':
                
                if (isAuthorized(args[0], userID))
                {
                    listeners.push(channelID);
                    bot.sendMessage({
                        to: channelID,
                        message: "Added current channel as a listener"
                    });

                    bot.deleteMessage({
                        channelID: channelID,
                        messageID: e.d.id
                    });
                }
                else
                {
                    fillerResponse(channelID);
                }
                
                break;
            
            case 'removelistener':
                if (!isListener(channelID))
                {
                    fillerResponse(channelID);
                }
                else
                {
                    for (var i = listeners.length - 1; i >= 0; i--)
                    {
                        if (listeners[i] == channelID)
                        {
                            listeners.splice(i, 1);
                            break;
                        }
                    }
                    
                    bot.deleteMessage({
                        channelID: channelID,
                        messageID: e.d.id
                    });
                    
                    bot.sendMessage({
                        to: channelID,
                        message: "Understood."
                    });
                }
                
                break;
            
            case 'wisdom':
            case 'quote':
                
                var msg = randomArrayElement(QUOTES);
                
                bot.sendMessage({
                    to: channelID,
                    message: msg
                });
                
                break;
            
            case 'help':
                
                var msg = "Everything will be revealed in time; the journey is more important than the destination.";
                
                bot.sendMessage({
                    to: channelID,
                    message: msg
                });
                
                break;
            
            case 'sucks':
                
                var msg = "I believe that message was intended for yourself.";
                
                bot.sendMessage({
                    to: channelID,
                    message: msg
                });

                break;
            
            case 'store':
                
                if (isAuthorized(args[0], userID))
                {
                    storedChannelIDs.push(channelID);
                    
                    bot.deleteMessage({
                        channelID: channelID,
                        messageID: e.d.id
                    });
                }
                else
                {
                    fillerResponse(channelID);
                }
                
                break;

            case 'repeat':

                if (isAuthorized(args[0], userID))
                {
                    // listeners.push(channelID);
                    bot.sendMessage({
                        to: channelID,
                        message: "Repeating..."
                    });

                    repeaters.push(userID);
                }
                else
                {
                    fillerResponse(channelID);
                }

                break;

            case 'repeat-off':
                
                if (repeaters.length == 0)
                {
                    fillerResponse(channelID);
                }
                else if (isAuthorized(args[0], userID))
                {
                    repeaters = [];

                    var msg = "Acknowledged.";

                    bot.sendMessage({
                        to: channelID,
                        message: msg
                    });
                }
                else
                {
                    fillerResponse(channelID);
                }

                break;

            case 'recognize':

                var msg;

                if (isCommander(userID))
                {
                    msg = "You are my commander.";
                }
                else
                {
                    msg = "You are not my commander.";
                }

                bot.sendMessage({
                    to: channelID,
                    message: msg
                });

                break;

            case 'filter':

                var msg;

                if (isAuthorized(args[1], userID))
                {
                    filter = args[0];
                }
                else
                {
                    fillerResponse(channelID);
                }

                break;

            case 'source':

                var msg = "Source code available at: https://github.com/Archaversine/ThrawnBot";

                bot.sendMessage({
                    to: channelID,
                    message: msg
                });

                break;
            
            default:
                fillerResponse(channelID);
        }

        var msg = "Recieved command request from " + user + ": " + message;
        
        if (!isListener(channelID))
        {
            broadcast(msg);
        }
    }
    else if (userID != credentials.botID)
    {
        var msg_debug = "Intercepted message from " + user + ": " + message;

        logger.info(msg_debug);
        
        var msg = "```\n";
        msg += "MESSAGE REPORT\n";
        msg += "========================\n";
        msg += "Username   : " + e.d.author.username + "#" + e.d.author.discriminator + "\n";
        msg += "Time       : " + e.d.timestamp + "\n";
        msg += "User ID    : " + e.d.author.id + "\n";
        msg += "Channel ID : " + e.d.channel_id + "\n";
        msg += "Guid ID    : " + e.d.guild_id + "\n";
        msg += "-------------------------------\n";
        msg += "Contents: " + e.d.content + "\n";
        msg += "-------------------------------\n";
        msg += "```";
        
        if (!isListener(channelID) && (filter == channelID || !hasFilter()))
        {
            broadcast(msg);
        }

        if (repeaters.length > 0)
        {
            for (var i = 0; i < repeaters.length; i++)
            {
                if (userID == repeaters[i])
                {
                    repeatMsg(message);
                }
            }
        }
    }

});

function broadcast(msg)
{
    if (listeners.length == 0)
    {
        return;
    }

    for (var i = 0; i < listeners.length; i++)
    {
        bot.sendMessage({
            to: listeners[i],
            message: msg
        });
    }
}

function repeatMsg(msg)
{
    if (storedChannelIDs.length == 0)
    {
        return;
    }

    for (var i = 0; i < storedChannelIDs.length; i++)
    {
        bot.sendMessage({
            to: storedChannelIDs[i],
            message: msg
        });
    }
}

function isListener(id)
{
    if (listeners.length == 0)
    {
        return false;
    }

    for (var i = 0; i < listeners.length; i++)
    {
        if (id == listeners[i])
        {
            return true;
        }
    }

    return false;
}

function fillerResponse(toID)
{
    // var response = FILLER_WORDS[Math.floor(Math.random() * FILLER_WORDS.length)];
    var response = randomArrayElement(FILLER_WORDS);
    bot.sendMessage({
        to: toID,
        message: response
    });
}

function randomArrayElement(array)
{
    return array[Math.floor(Math.random() * array.length)];
}

function isCommander(id)
{
    return id == credentials.commander;
}

function isAuthorized(argument, id)
{
    return (argument == LISTENER_PASSWORD) || isCommander(id);
}

function hasFilter()
{
    return filter != null;
}
