export default {
    "engine": {
        "katago": "",
        "altcommand": "",
        "model": "katrain/models/kata1-b18c384nbt-s9996604416-d4316597426.bin.gz",
        "humanlike_model": "",
        "config": "katrain/KataGo/analysis_config.cfg",
        "maxVisits": 500,
        "fastVisits": 25,
        "maxTime": 8.0,
        "wideRootNoise": 0.04,
        "enableOwnership": true
    },
    "contribute": {
        "katago": "",
        "config": "katrain/KataGo/contribute_config.cfg",
        "ownership": false,
        "maxgames": 6,
        "movespeed": 2,
        "username": "",
        "password": "",
        "savepath": "./dist_sgf/",
        "savesgf": false
    },
    "general": {
        "sgfLoad": "~/Downloads",
        "sgfSave": "./sgfout",
        "animPvTime": 0.5,
        "debugLevel": 0,
        "lang": "en",
        "version": "1.17.0",
        "loadFastAnalysis": false,
        "loadSgfRewind": true
    },
    "timer": {
        "byoLength": 30,
        "byoPeriods": 5,
        "minimalUse": 0,
        "mainTime": 0,
        "sound": true
    },
    "game": {
        "size": "19",
        "komi": 6.5,
        "handicap": 0,
        "rules": "japanese",
        "clearCache": false,
        "setupMove": 100,
        "setupAdvantage": 20
    },
    "trainer": {
        "theme": "theme:normal",
        "numUndoPrompts": [
            1,
            1,
            1,
            0.5,
            0,
            0
        ],
        "evalThresholds": [
            12,
            6,
            3,
            1.5,
            0.5,
            0
        ],
        "saveFeedback": [
            true,
            true,
            true,
            true,
            false,
            false
        ],
        "showDots": [
            true,
            true,
            true,
            true,
            true,
            true
        ],
        "extraPrecision": false,
        "saveAnalysis": false,
        "saveMarks": false,
        "lowVisits": 25,
        "evalOnShowLast": 3,
        "topMovesShow": "top_move_delta_score",
        "topMovesShowSecondary": "top_move_visits",
        "evalShowAi": true,
        "lockAi": false
    },
    "ai": {
        "ai:default": {},
        "ai:antimirror": {},
        "ai:handicap": {
            "automatic": true,
            "pda": 0
        },
        "ai:jigo": {
            "targetScore": 0.5
        },
        "ai:scoreloss": {
            "strength": 0.2
        },
        "ai:policy": {
            "openingMoves": 22.0
        },
        "ai:simple": {
            "maxPointsLost": 1.75,
            "settledWeight": 1.0,
            "opponentFac": 0.5,
            "minVisits": 3,
            "attachPenalty": 1,
            "tenukiPenalty": 0.5
        },
        "ai:p:weighted": {
            "weakenFac": 1.25,
            "pickOverride": 1.0,
            "lowerBound": 0.001
        },
        "ai:p:pick": {
            "pickOverride": 0.95,
            "pickN": 5,
            "pickFrac": 0.35
        },
        "ai:p:local": {
            "pickOverride": 0.95,
            "stddev": 1.5,
            "pickN": 15,
            "pickFrac": 0.0,
            "endgame": 0.5
        },
        "ai:p:tenuki": {
            "pickOverride": 0.85,
            "stddev": 7.5,
            "pickN": 5,
            "pickFrac": 0.4,
            "endgame": 0.45
        },
        "ai:p:influence": {
            "pickOverride": 0.95,
            "pickN": 5,
            "pickFrac": 0.3,
            "threshold": 3.5,
            "lineWeight": 10,
            "endgame": 0.4
        },
        "ai:p:territory": {
            "pickOverride": 0.95,
            "pickN": 5,
            "pickFrac": 0.3,
            "threshold": 3.5,
            "lineWeight": 2,
            "endgame": 0.4
        },
        "ai:p:rank": {
            "kyuRank": 4.0
        },
        "ai:human": {
            "humanKyuRank": 8,
            "modernStyle": false
        },
        "ai:pro": {
            "proYear": 1914
        }
    },
    "ui_state": {
        "restoresize": true,
        "size": [],
        "play": {
            "analysisControls": {
                "showChildren": true,
                "eval": false,
                "hints": false,
                "policy": false,
                "ownership": false
            },
            "panels": {
                "graphPanel": [
                    "open",
                    {
                        "score": true,
                        "winrate": false
                    }
                ],
                "statsPanel": [
                    "open",
                    {
                        "score": true,
                        "winrate": true,
                        "points": true
                    }
                ],
                "notesPanel": [
                    "open",
                    {
                        "info": true,
                        "info-details": false,
                        "notes": false
                    }
                ]
            }
        },
        "analyze": {
            "analysisControls": {
                "showChildren": true,
                "eval": true,
                "hints": true,
                "policy": false,
                "ownership": true
            },
            "panels": {
                "graphPanel": [
                    "open",
                    {
                        "score": true,
                        "winrate": true
                    }
                ],
                "statsPanel": [
                    "open",
                    {
                        "score": true,
                        "winrate": true,
                        "points": true
                    }
                ],
                "notesPanel": [
                    "open",
                    {
                        "info": true,
                        "info-details": true,
                        "notes": false
                    }
                ]
            }
        }
    }
}