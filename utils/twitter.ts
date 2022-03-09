import Twitter from 'twitter';

const { env } = process;

const T = new Twitter({
  consumer_key: env.TWITTER_API_KEY,
  consumer_secret: env.TWITTER_SECRET_KEY,
  access_token_key: env.TWITTER_ACCESS_TOKEN,
  access_token_secret: env.TWITTER_ACCESS_TOKEN_SECRET,
});

export interface Tweet {
  created_at: String;
  id: String;
  id_str: String;
  text: String;
  full_text: String;
  truncated: String;
  entities: String;
  source: String;
  in_reply_to_status_id: String;
  in_reply_to_status_id_str: String;
  in_reply_to_user_id: String;
  in_reply_to_user_id_str: String;
  in_reply_to_screen_name: String;
  user: String;
  geo: String;
  coordinates: String;
  place: String;
  contributors: String;
  is_quote_status: String;
  retweet_count: String;
  favorite_count: String;
  favorited: String;
  retweeted: String;
  lang: String;
}

export class TwitterClient {
  user: string;

  constructor() {
    this.user = `(from%3A${env.TWITTER_USER})`;
  }

  /**
   * Return all tweets from user
   * @param {string} user_id Id of user to retrieve timeline for
   */
  async getAll(user_id: string): Promise<Tweet[]> {
    return new Promise((resolve, reject) => {
      T.get(
        'statuses/user_timeline',
        { user_id, tweet_mode: 'extended' },
        (err: Error, data: Tweet[]) => {
          if (err) {
            return reject(err);
          }

          resolve(data);
        }
      );
    });
  }
}
