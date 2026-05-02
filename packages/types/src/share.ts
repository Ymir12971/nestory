// Story sharing — aligns with POST /shares and GET /shares/public/:token

export interface ShareOg {
  title: string;
  description: string;
  imageUrl: string;
}

// POST /shares response (200 = existing token reused, 201 = new token created)
export interface StoryShare {
  id: string;
  storyId: string;
  token: string;
  shareUrl: string;
  og: ShareOg;
  createdAt: string;
}

// POST /shares body
export interface ShareCreate {
  storyId: string;
}

// GET /shares/public/:token response
// StoryDocument imported inline to avoid circular deps at module level
export interface PublicShare {
  storyId: string;
  document: Record<string, unknown>; // cast to StoryDocument at call site
  og: ShareOg;
}
