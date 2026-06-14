/**
 * Searches YouTube for videos matching the query and returns an array of { videoId, title }.
 * Uses official YouTube API v3 if API key is provided, otherwise falls back to page scraping.
 * @param {string} query The search query
 * @param {number} maxResults Maximum number of videos to return (default 5)
 * @returns {Promise<Array<{videoId: string, title: string}>>} Array of video objects
 */
export async function searchYouTubeVideosList(query, maxResults = 5) {
  const apiKey = process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY.trim() !== ''
    ? process.env.YOUTUBE_API_KEY.trim()
    : null;

  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`YouTube API returned HTTP status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title || 'YouTube Tutorial'
        }));
      }
    } catch (error) {
      console.warn('YouTube API search failed, falling back to scraper:', error.message);
    }
  }

  // Fallback: Scrape the YouTube search page
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube scrape request returned HTTP status ${response.status}`);
    }

    const html = await response.text();
    const videoIdMatches = [];
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let match;
    const seenIds = new Set();
    
    // Extract unique videoIds
    while ((match = videoIdRegex.exec(html)) !== null) {
      const id = match[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        videoIdMatches.push(id);
        if (videoIdMatches.length >= maxResults) break;
      }
    }

    const results = [];
    for (const id of videoIdMatches) {
      let title = 'YouTube Tutorial';
      const idIdx = html.indexOf(`"videoId":"${id}"`);
      if (idIdx !== -1) {
        // Look ahead 2000 characters for the title patterns
        const chunk = html.substring(idIdx, idIdx + 2000);
        // Match: "title":{"runs":[{"text":"Title Here"}]}
        const titleMatch = chunk.match(/"title":\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        } else {
          // Alternative match: "title":{"simpleText":"Title Here"}
          const altTitleMatch = chunk.match(/"title":\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/);
          if (altTitleMatch && altTitleMatch[1]) {
            title = altTitleMatch[1];
          }
        }
      }
      
      // Clean HTML entities or escape chars in title if any
      const cleanTitle = title
        .replace(/\\u0026/g, '&')
        .replace(/\\"/g, '"')
        .replace(/&amp;/g, '&');

      results.push({ videoId: id, title: cleanTitle });
    }

    return results;
  } catch (error) {
    console.error(`Error scraping YouTube for query "${query}":`, error);
    return [];
  }
}

/**
 * Searches YouTube for a single video matching the query and returns the videoId.
 * @param {string} query The search query
 * @returns {Promise<string>} The YouTube video ID or an empty string if not found
 */
export async function searchYouTubeVideo(query) {
  const list = await searchYouTubeVideosList(query, 1);
  return list.length > 0 ? list[0].videoId : '';
}

