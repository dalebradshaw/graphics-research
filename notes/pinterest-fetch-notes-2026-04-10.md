# Pinterest Fetch Notes - 2026-04-10

Working query shape:

```text
fetch the <board/category name> pins at full size and store them in <output folder>
```

Example:

```text
fetch the Amusement Park pins at full size and store them in /path/to/folder
```

Resolved category metadata:

```json
{
  "name": "Amusement Park",
  "board_id": "639652022014886707",
  "url": "https://www.pinterest.com/dalebradshaw1965/amusement-park/",
  "pin_count": 158,
  "section_count": 0,
  "privacy": "public"
}
```

Read-only board list fetch:

```http
POST /resource/BoardsResource/get/
```

Body form fields:

```json
{
  "source_url": "/dalebradshaw1965/_saved/",
  "data": "{\"options\":{\"privacy_filter\":\"all\",\"sort\":\"last_pinned_to\",\"field_set_key\":\"profile_grid_item\",\"filter_stories\":false,\"username\":\"dalebradshaw1965\",\"page_size\":25,\"group_by\":\"mix_public_private\",\"include_archived\":true,\"redux_normalize_feed\":true,\"filter_all_pins\":false},\"context\":{}}"
}
```

Read-only board pin fetch:

```http
POST /resource/BoardFeedResource/get/
```

Required headers observed:

```http
Accept: application/json, text/javascript, */*, q=0.01
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-Requested-With: XMLHttpRequest
X-CSRFToken: <from same-origin document.cookie>
X-APP-VERSION: 306e743
X-Pinterest-AppState: active
X-Pinterest-Source-Url: /dalebradshaw1965/amusement-park/
X-Pinterest-PWS-Handler: www/[username]/[slug]
screen-dpr: <window.devicePixelRatio>
```

Normal pin-rich options:

```json
{
  "add_vase": false,
  "board_id": "639652022014886707",
  "field_set_key": "react_grid_pin",
  "filter_section_pins": true,
  "is_react": true,
  "prepend": false,
  "page_size": 10,
  "bookmarks": null
}
```

This returns pin records with `images` keys including `170x`, `136x136`, `236x`, `474x`, `736x`, and `orig`. For full-size export, prefer `images.orig.url`, falling back to the largest available size.

Image-only options:

```json
{
  "board_id": "639652022014886707",
  "field_set_key": "images_only_item",
  "filter_section_pins": false,
  "page_size": 10
}
```

This returns a narrower payload and, in the observed sample, only included `236x` and `474x`, so it is not suitable for full-size export.

Pagination:

Use `resource.options.bookmarks` from each response as the next request's `options.bookmarks`. Stop when bookmarks include `-end-` or repeat.

## Write query shape: post image to Pinterest board

Working query shape:

```text
post <the current image | image URL | local image path> to the <board/category name> category on Pinterest
```

Example:

```text
post the image we are working with to the Amusement Park category on Pinterest
```

Resolved example target:

```json
{
  "name": "Amusement Park",
  "board_id": "639652022014886707",
  "url": "https://www.pinterest.com/dalebradshaw1965/amusement-park/"
}
```

Safety rule:

This is a write action. Resolve the target board first, summarize the intended image and destination, and require explicit user confirmation before creating the pin.

Preferred official API path:

```http
POST https://api.pinterest.com/v5/pins
```

Official `PinCreate` fields relevant to this query:

```json
{
  "board_id": "<target board id>",
  "board_section_id": "<optional section id>",
  "title": "<optional title>",
  "description": "<optional description>",
  "link": "<optional outbound link>",
  "alt_text": "<optional alt text>",
  "media_source": {
    "source_type": "<pin_url | image_url | image_base64 | multiple_image_urls | video_id>",
    "url": "<image URL when applicable>",
    "content_type": "<MIME type when applicable>",
    "data": "<base64 image data when applicable>",
    "media_id": "<uploaded media id when applicable>"
  },
  "parent_pin_id": "<optional source pin id when saving from another pin>"
}
```

Private web write path observed in the Pinterest bundle, not yet executed:

```http
POST /resource/RepinResource/create/
```

Observed option names from the minified web bundle:

```json
{
  "board_id": "<target board id>",
  "board_session_id": "<optional board session id>",
  "clientTrackingParams": "<optional tracking params>",
  "description": "<optional description>",
  "image_base64": "<base64 image data, if used>",
  "image_url": "<source image URL, if used>",
  "is_buyable_pin": false,
  "is_removable": false,
  "link": "<optional outbound link>",
  "media_upload_id": "<uploaded media id, if used>",
  "pin_id": "<source pin id, if saving an existing Pinterest pin>",
  "section": "<optional section id>",
  "title": "<optional title>",
  "eventContext": "<optional event context>"
}
```

Private web upload path observed in the Pinterest bundle, not yet executed:

```http
POST /upload-image/
```

Upload notes:

Send a same-origin `FormData` body with field `img` and `X-CSRFToken` from the authenticated Pinterest page. The observed bundle expects upload results such as `image_signature` and `media_upload_id`, then passes them into a create/publish resource.

## Pinterest Chrome Extension write path

Installed extension observed:

```json
{
  "id": "gpdjojdkbbmdfjfahjcgigfpmkopogic",
  "version": "6.13.0",
  "name": "Pinterest Save Extension / Pinterest Save Button",
  "path": "~/Library/Application Support/Google/Chrome/Default/Extensions/gpdjojdkbbmdfjfahjcgigfpmkopogic/6.13.0_0"
}
```

The extension calls Pinterest's private v3 API from its background service worker. It derives an extension request token from the authenticated Pinterest session cookie internally; do not dump the cookie value into notes or logs.

Extension request headers observed in `backgroundScript.js` and `assets/rules.json`:

```http
Accept: application/json
Accept-Language: <navigator.language>
charset: UTF-8
X-Pinterest-App-Type-Detailed: 8
X-Client-ID: 1447278
X-Request-Forgery-Token: <extension-derived token>
User-Agent:  Pinterest Save Extension (Chrome)
```

Extension board fetch:

```http
GET https://api.pinterest.com/v3/users/me/boards/feed/?page_size=250&filter=all&sort=last_pinned_to&add_fields=board.image_cover_url,board.privacy,board.collaborated_by_me,board.section_count
```

Extension board sections fetch:

```http
GET https://api.pinterest.com/v3/board/<board_id>/sections/
```

Extension create-pin path for a non-Pinterest image URL or base64 image, not yet executed:

```http
PUT https://api.pinterest.com/v3/pins/
```

Observed `FormData` fields:

```json
{
  "board_id": "<target board id>",
  "section": "<optional section id>",
  "method": "extension",
  "add_fields": "user.is_partner",
  "description": "<optional description, max 500 chars in bundle>",
  "source_url": "<optional source page URL, max 2048 chars in bundle>",
  "found_metadata": "<optional metadata blob>",
  "image_url": "<image URL when not using base64>",
  "image_base64": "<base64 image data when used>",
  "isGeneratedTextImage": "true when pinUrl is empty",
  "color": "<fallback generated image color, default #ffffff>"
}
```

Extension repin path for an existing Pinterest pin URL, not yet executed:

```http
POST https://api.pinterest.com/v3/pins/<pin_id>/repin/
```

Observed `FormData` fields:

```json
{
  "board_id": "<target board id>",
  "section": "<optional section id>"
}
```
