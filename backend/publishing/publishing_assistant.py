import json
import re
from typing import Dict, Any, List, Optional
from backend.config import settings


class PublishingAssistant:
    """
    AI Publishing Assistant for YouTube Shorts and Instagram Reels.
    Generates high-CTR viral titles, platform-optimized descriptions,
    trending hashtags, engaging pinned comments, and high-impact thumbnail text.
    """

    @staticmethod
    def generate_metadata(
        clip_title: str,
        category: str,
        transcript_snippet: str,
        creator_name: str,
        target_platform: str = "youtube_shorts"
    ) -> Dict[str, Any]:
        """
        Produce complete publishing package tailored to YouTube Shorts or Instagram Reels.
        """
        category_clean = category.lower()
        clean_snippet = transcript_snippet.strip()

        # 1. High-CTR Titles
        title_templates = {
            "reaction": [
                f"HIS REACTION AT THE END! 😱 #Shorts",
                f"HE DID NOT EXPECT THIS... 🤯",
                f"Bro was completely SPEECHLESS! 😂 #Shorts",
                f"The exact moment he realized... 👀"
            ],
            "gaming": [
                f"1 HP AND A DREAM?! 🎯🔥 #Shorts",
                f"HOW DID HE CLUTCH THIS?! 🤯",
                f"Most INSANE play of the stream! 🎮 #Shorts",
                f"Chat told him not to peek... 💀"
            ],
            "screaming": [
                f"BRO JUMPED OUT OF HIS CHAIR! 😭💀",
                f"The Loudest Moment On Twitch History 🔊",
                f"HE LOST HIS MIND OVER THIS! 😱 #Shorts"
            ],
            "punchline": [
                f"The plot twist nobody saw coming... 💀😂",
                f"Wait for the end... I can't breathe! 😭 #Shorts",
                f"He really thought he got away with it! 😂"
            ],
            "storytelling": [
                f"The CRAZIEST story you'll hear today... 😳",
                f"I still can't believe this actually happened! 🤯",
                f"Listen to the end of this story... 👀 #Shorts"
            ],
            "educational": [
                f"Stop doing this right now! (Secret Tip) 💡",
                f"The real reason nobody talks about this... 🧠",
                f"Most people get this completely wrong! 📈 #Shorts"
            ]
        }

        default_titles = [
            f"{clip_title.upper()}! 🔥 #Shorts",
            f"You will not believe what happened! 😱",
            f"Wait till you see this... 👀 #Shorts"
        ]

        titles = title_templates.get(category_clean, default_titles)
        generated_title = titles[0]

        # 2. Short Descriptions
        if target_platform == "youtube_shorts":
            description = (
                f"{clip_title} 🔥 Watch what happened during the stream!\n\n"
                f"Creator: @{creator_name}\n"
                f"Subscribe for more daily stream highlights and clutch moments! 🔔\n\n"
                f"#Shorts #YouTubeShorts #Streamer #Gaming"
            )
        else:  # Instagram Reels
            description = (
                f"Wait for the end of this! 😭 Tag a friend who needs to see this 👀\n\n"
                f"Credit: @{creator_name}\n"
                f"Drop a follow for more viral gaming & stream clips! ⚡\n\n"
                f"#reels #viralvideos #streamer #explorepage"
            )

        # 3. Trending Hashtags
        platform_tags = ["#Shorts", "#YouTubeShorts"] if target_platform == "youtube_shorts" else ["#reels", "#reelsinstagram", "#explorepage"]
        category_tags = {
            "reaction": ["#reaction", "#funnyreaction", "#twitchclips", "#streamerfails", "#viralclip"],
            "gaming": ["#gaming", "#clutch", "#gamer", "#gamersoftiktok", "#esports", "#gameplay"],
            "screaming": ["#jumpscare", "#funny", "#rage", "#streamer", "#hilarious"],
            "punchline": ["#comedy", "#humor", "#memes", "#relatable", "#funnymoments"],
            "storytelling": ["#storytime", "#crazyfacts", "#truestory", "#podcasts"],
            "educational": ["#lifehacks", "#tipsandtricks", "#learnontiktok", "#education"]
        }
        hashtags = platform_tags + category_tags.get(category_clean, ["#viral", "#trending", "#clips"])

        # 4. Pinned Engagement Comment
        pinned_comments = {
            "reaction": "Rate this reaction from 1 to 10 in the comments below! 👇😂",
            "gaming": "Would you have clutched this or sold the round? Be honest 👇💀",
            "punchline": "What would you have done in this situation? Drop a comment! 👇",
            "screaming": "Turn your volume down before you watch this! Who else screamed? 😭👇",
            "storytelling": "What is the craziest thing that ever happened to you? Tell me below! 👇",
            "educational": "Did you already know this or is this new to you? Let me know! 👇"
        }
        pinned_comment = pinned_comments.get(category_clean, "What was your favorite part of this clip? Let me know below! 👇🔥")

        # 5. Suggested Thumbnail Text
        thumb_texts = {
            "reaction": "NO WAY! 😱",
            "gaming": "1 HP CLUTCH?!",
            "punchline": "PLOT TWIST! 💀",
            "screaming": "HE LOST IT! 🔊",
            "storytelling": "TRUE STORY 😳",
            "educational": "DON'T DO THIS ❌"
        }
        thumbnail_text = thumb_texts.get(category_clean, "WATCH THIS! 🔥")

        return {
            "target_platform": target_platform,
            "generated_title": generated_title,
            "alternate_titles": titles[1:],
            "generated_description": description,
            "hashtags": hashtags,
            "pinned_comment": pinned_comment,
            "thumbnail_text": thumbnail_text,
            "approval_status": "draft",
            "published_status": "not_published"
        }
