export const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;

/**
 * "@Mash", "@mash ai", "@Mash-AI" or "@AI", any capitalisation, as a word of
 * its own. The "@" is required: the old pattern made it optional and was
 * case-sensitive, so "Mumbai", "chai" and "smash" summoned Mash while "@mAsh"
 * did not.
 */
export const MENTION_REGEX = /(^|[^\w@])@(?:mash(?:[\s-]?ai)?|ai)\b/i;

/** Same mention, for stripping it out of the prompt sent to the AI. */
export const MENTION_STRIP_REGEX = /@(?:mash(?:[\s-]?ai)?|ai)\b/gi;

export const MASH_AI_USER_ID = "mash-ai";
