# WeChat Integration Documentation

## Overview

The WeChat integration allows users to send messages, images, links, and voice notes directly from WeChat to their KnowledgeVault knowledge base. Content is automatically processed, categorized, and made searchable using AI.

## Setup Requirements

### Environment Variables

Configure these environment variables in your application:

```bash
# WeChat Official Account Configuration
WECHAT_TOKEN=your_verification_token
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret

# Application Base URL (for QR code linking)
BASE_URL=https://your-domain.com
```

### WeChat Official Account Setup

1. **Register WeChat Official Account**
   - Go to [WeChat Official Accounts Platform](https://mp.weixin.qq.com/)
   - Register a new official account
   - Complete verification process

2. **Configure Webhook URL**
   - In WeChat admin panel, go to Basic Configuration
   - Set webhook URL: `https://your-domain.com/api/wechat/webhook`
   - Set token (same as `WECHAT_TOKEN` environment variable)
   - Choose message encryption mode (optional)

3. **Enable Required Permissions**
   - Enable "Receive all messages" 
   - Enable "Customer service interface"
   - Enable "QR code with parameters" (for account linking)

## API Endpoints

### Webhook Endpoints

#### GET /api/wechat/webhook
**Purpose:** WeChat server verification
**Method:** GET
**Parameters:**
- `signature` (required): WeChat signature
- `timestamp` (required): Unix timestamp
- `nonce` (required): Random string
- `echostr` (required): Challenge string to echo back

**Response:** Returns `echostr` if verification succeeds

#### POST /api/wechat/webhook
**Purpose:** Receive messages and events from WeChat
**Method:** POST
**Content-Type:** `text/xml`
**Body:** WeChat XML message format

**Supported Message Types:**
- Text messages
- Image messages
- Link messages
- Voice messages
- Events (subscribe, unsubscribe, scan QR)

### Account Management Endpoints

#### GET /api/wechat/link/qr
**Purpose:** Generate QR code for account linking
**Method:** GET
**Authentication:** Required
**Response:**
```json
{
  "qrCode": "data:image/png;base64,..."
}
```

#### GET /api/wechat/integrations
**Purpose:** Get user's WeChat integrations
**Method:** GET
**Authentication:** Required
**Response:**
```json
[
  {
    "id": "integration_id",
    "userId": "user_id",
    "wechatOpenId": "wx_openid",
    "nickname": "WeChat Nickname",
    "avatarUrl": "https://...",
    "isActive": true,
    "lastMessageAt": "2025-01-20T10:30:00Z",
    "createdAt": "2025-01-15T10:30:00Z"
  }
]
```

#### DELETE /api/wechat/integrations/:id
**Purpose:** Remove WeChat integration
**Method:** DELETE
**Authentication:** Required
**Response:**
```json
{
  "success": true
}
```

## Account Linking Process

### Step 1: Generate QR Code
1. User visits WeChat settings page in KnowledgeVault
2. Clicks "Generate QR Code" button
3. System generates unique linking token (expires in 10 minutes)
4. QR code is displayed containing linking URL

### Step 2: WeChat User Scan
1. User scans QR code with WeChat
2. WeChat sends scan event to webhook
3. System processes event and links accounts
4. Confirmation message sent to user in WeChat

### Step 3: Account Linked
1. User can now send messages to WeChat official account
2. All content automatically saved to knowledge base
3. AI processing applied for categorization and search

## Message Processing Flow

### Text Messages
1. **Receive:** Text message from WeChat user
2. **Validate:** Check if user account is linked and active
3. **Process:** Generate AI summary and title if content > 100 characters
4. **Save:** Create knowledge item with type "text"
5. **Respond:** Send confirmation message to WeChat

### Image Messages
1. **Receive:** Image message with URL or media ID
2. **Validate:** Check user account status
3. **Process:** AI image analysis (placeholder - requires implementation)
4. **Save:** Create knowledge item with type "image"
5. **Respond:** Send confirmation message

### Link Messages
1. **Receive:** Shared link with title and description
2. **Validate:** Check user account status
3. **Process:** Extract and analyze web content (placeholder - requires implementation)
4. **Save:** Create knowledge item with type "link"
5. **Respond:** Send confirmation message

### Voice Messages
1. **Receive:** Voice message with media ID
2. **Validate:** Check user account status
3. **Process:** Save metadata (transcription requires implementation)
4. **Save:** Create knowledge item with type "audio"
5. **Respond:** Send confirmation message

## XML Message Formats

### Text Message (Incoming)
```xml
<xml>
  <ToUserName><![CDATA[official_account_id]]></ToUserName>
  <FromUserName><![CDATA[user_openid]]></FromUserName>
  <CreateTime>1234567890</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[User message content]]></Content>
  <MsgId>1234567890</MsgId>
</xml>
```

### Image Message (Incoming)
```xml
<xml>
  <ToUserName><![CDATA[official_account_id]]></ToUserName>
  <FromUserName><![CDATA[user_openid]]></FromUserName>
  <CreateTime>1234567890</CreateTime>
  <MsgType><![CDATA[image]]></MsgType>
  <PicUrl><![CDATA[image_url]]></PicUrl>
  <MediaId><![CDATA[media_id]]></MediaId>
  <MsgId>1234567890</MsgId>
</xml>
```

### Text Response (Outgoing)
```xml
<xml>
  <ToUserName><![CDATA[user_openid]]></ToUserName>
  <FromUserName><![CDATA[official_account_id]]></FromUserName>
  <CreateTime>1234567890</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[Response message]]></Content>
</xml>
```

## Error Handling

### Common Error Scenarios

1. **User Not Linked**
   - Response: "请先扫描二维码关联您的KnowledgeVault账户"
   - English: "Please scan QR code to link your KnowledgeVault account"

2. **Processing Failed**
   - Response: "❌ 保存失败，请稍后重试"
   - English: "❌ Failed to save, please try again"

3. **Unsupported Message Type**
   - Response: "暂不支持此类型消息"
   - English: "Currently not supported message type"

4. **Invalid Signature**
   - HTTP 403: "Invalid signature"

5. **Missing Parameters**
   - HTTP 400: "Missing required parameters"

## Security Considerations

### Signature Verification
All webhook requests must pass signature verification:
1. Sort token, timestamp, nonce alphabetically
2. Concatenate sorted values
3. Calculate SHA1 hash
4. Compare with provided signature

### Rate Limiting
Consider implementing rate limiting to prevent abuse:
- Per user: 10 messages/minute
- Per IP: 100 requests/minute

### Data Privacy
- Store minimal user data (OpenID, nickname, avatar)
- Provide deletion endpoints for GDPR compliance
- Encrypt sensitive data at rest

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check WECHAT_TOKEN matches WeChat admin panel
   - Verify URL is accessible from internet
   - Check signature calculation logic

2. **Messages Not Processing**
   - Verify webhook endpoint receives POST requests
   - Check XML parsing for malformed messages
   - Review application logs for errors

3. **QR Code Linking Fails**
   - Check token expiration (10 minutes)
   - Verify user authentication status
   - Ensure database connectivity

4. **AI Processing Errors**
   - Check AI service API keys
   - Verify content length limits
   - Review error handling in processing pipeline

### Debugging Tools

1. **Test Webhook Locally**
   ```bash
   curl -X POST http://localhost:5000/api/wechat/webhook \
     -H "Content-Type: text/xml" \
     -d '<xml><MsgType><![CDATA[text]]></MsgType>...</xml>'
   ```

2. **Check Database**
   ```sql
   SELECT * FROM wechat_integrations WHERE "isActive" = true;
   ```

3. **Monitor Logs**
   ```bash
   tail -f logs/application.log | grep "WeChat"
   ```

## Future Enhancements

### Planned Features
- [ ] Voice message transcription
- [ ] Image content analysis with vision AI
- [ ] Web link content extraction
- [ ] Batch message processing
- [ ] Rich media responses
- [ ] Custom keyword triggers
- [ ] Message scheduling
- [ ] Analytics dashboard

### API Extensions
- [ ] Message history export
- [ ] Bulk account management
- [ ] Custom response templates
- [ ] Integration webhooks
- [ ] Message filtering rules

## Support

For technical support or questions:
1. Check application logs for error details
2. Verify environment configuration
3. Test webhook connectivity
4. Review WeChat Official Account settings
5. Contact development team with specific error messages