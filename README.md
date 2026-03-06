# 🌸 uwu-chan-saas

<div align="center">

[![Discord.js](https://img.shields.io/badge/Discord.js-v14.18.0-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8.12.0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A production-ready Discord SaaS bot with 271+ slash commands, rich embeds, interactive buttons, and tiered premium access.**

[Features](#features) • [Installation](#installation) • [Commands](#commands) • [Tiers](#tier-comparison) • [Documentation](#documentation)

</div>

---

## ✨ Features Showcase

### 🎨 Rich Discord Embeds
- **Vibrant color-coded tiers**: Free (🔹 Blurple), Premium (✨ Pink), Enterprise (👑 Gold)
- **Custom thumbnails & icons** per tier level
- **Timestamps** on all embeds for audit trails
- **Server-specific branding** support

### 📊 Visual Progress Bars
```
Staff Performance: ████████░░░ 73%
Server Uptime:     ██████████░ 91%
Task Completion:   █████░░░░░░ 45%
```
- Unicode block characters for crisp display
- Customizable lengths and styling
- Percentage indicators

### 🔘 Interactive Buttons
- **Refresh** data in real-time
- **Export** to CSV/JSON
- **Pagination** for long lists
- **Confirmation dialogs** for destructive actions
- **Navigation** between related commands

### 🗄️ Real Functional Data
- **MongoDB integration** for persistent storage
- **Real-time analytics** from database queries
- **Staff activity tracking** with message counting
- **Shift management** with start/end timestamps
- **Ticket system** with claim/close workflows

### 🔒 Security First
- **NoSQL injection prevention** with input validation
- **Rate limiting** on all API endpoints
- **PayPal webhook signature verification**
- **Stripe webhook signature verification**
- **Discord ID validation** (17-20 digit snowflakes)

---

## 📋 Command Categories

### 👔 Staff Management (v1-v2 Free)
| Command | Description |
|---------|-------------|
| `/shift_start` | Begin a staff shift with timestamp logging |
| `/shift_end` | End shift and calculate duration |
| `/addpoints` | Award points to staff members |
| `/removepoints` | Deduct points from staff |
| `/promote` | Manual promotion with rank tracking |
| `/demote` | Manual demotion with reason logging |
| `/staff_stats` | View detailed staff performance stats |
| `/leaderboard` | Points-based staff leaderboard |

### 🎫 Ticket System (v1-v2 Free)
| Command | Description |
|---------|-------------|
| `/ticketsetup` | Configure ticket categories & channels |
| `/ticketlogs` | View historical ticket data |
| `/claim` | Claim an open ticket |
| `/close` | Close and archive a ticket |
| `/transcript` | Generate conversation transcript |

### 📝 Applications (v1-v2 Free)
| Command | Description |
|---------|-------------|
| `/applysetup` | Configure staff application form |
| `/applypanel` | Display application submission panel |
| `/view_applications` | Review pending applications |
| `/accept` | Accept an applicant |
| `/deny` | Deny with optional reason |

### 📊 Analytics (v3-v5 Premium)
| Command | Description |
|---------|-------------|
| `/activity_chart` | Visual activity graphs |
| `/engagement_metrics` | User engagement statistics |
| `/growth_report` | Server growth analytics |
| `/peak_hours` | Identify active time periods |
| `/retention_analysis` | Member retention metrics |

### 🛡️ Moderation (v4 Premium)
| Command | Description |
|---------|-------------|
| `/warn` | Issue warnings with escalation |
| `/mute` | Timeout/mute users |
| `/kick` | Remove users from server |
| `/ban` | Ban with duration options |
| `/case_lookup` | View moderation history |

### 🤖 Automation (v7 Enterprise)
| Command | Description |
|---------|-------------|
| `/auto_promotion` | Configure automatic rank upgrades |
| `/milestone_alerts` | Set up achievement notifications |
| `/scheduled_reports` | Automated analytics reports |
| `/smart_suggestions` | AI-powered staff recommendations |

### 👑 Ultimate Features (v8 Enterprise)
| Command | Description |
|---------|-------------|
| `/custom_branding` | White-label embed styling |
| `/advanced_analytics` | Predictive staff insights |
| `/api_access` | Generate API keys |
| `/webhook_config` | Custom webhook endpoints |

---

## 💎 Tier Comparison

| Feature | 🔹 Free<br>(v1-v2) | ✨ Premium<br>(v3-v5) | 👑 Enterprise<br>(v6-v8) |
|---------|:------------------:|:--------------------:|:------------------------:|
| **Commands** | 80 | 89 | 102 |
| **Rich Embeds** | ✅ | ✅ | ✅ |
| **Progress Bars** | ✅ | ✅ | ✅ |
| **Interactive Buttons** | ✅ | ✅ | ✅ |
| **Staff Management** | ✅ | ✅ | ✅ |
| **Ticket System** | ✅ | ✅ | ✅ |
| **Applications** | ✅ | ✅ | ✅ |
| **Analytics Dashboard** | ❌ | ✅ | ✅ |
| **Moderation Tools** | ❌ | ✅ | ✅ |
| **Automation Rules** | ❌ | ❌ | ✅ |
| **Custom Branding** | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **Webhook Integration** | ❌ | ❌ | ✅ |

**Total: 271 slash commands across all tiers**

---

## 🚀 Installation

### Prerequisites
- Node.js >= 20.0.0
- MongoDB Atlas or local instance
- Discord Bot Token
- Stripe account (for payments)
- PayPal account (for payments)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Reyrey-mibombo/uwu-chan-saas.git
cd uwu-chan-saas

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start the bot
npm start
```

### Development Mode
```bash
npm run dev
```

### Deploy Commands
```bash
npm run deploy
```

---

## ⚙️ Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | `MTI5N...` |
| `CLIENT_ID` | Discord application ID | `1296123456789012345` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `OWNER_IDS` | Comma-separated bot owner IDs | `1357317173470564433` |

### Optional - Tiers
| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLED_TIERS` | Comma-separated tiers to load | `v1,v2,v3,v4,v5,v6,v7,v8` |

### Optional - Payments
| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PAYPAL_CLIENT_ID` | PayPal REST API client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal REST API secret |
| `PAYPAL_WEBHOOK_ID` | PayPal webhook ID |
| `PAYPAL_WEBHOOK_SECRET` | PayPal webhook secret |
| `PREMIUM_CHECKOUT_URL` | URL for Premium upgrade |
| `ENTERPRISE_CHECKOUT_URL` | URL for Enterprise upgrade |

### Optional - Features
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Express server port | `3000` |
| `BOT_URL` | Public bot URL | - |
| `LICENSE_ENCRYPTION_KEY` | Key for license encryption | - |
| `TEST_GUILD_ID` | Guild ID for testing | - |
| `REDIS_URL` | Redis connection (caching) | - |

---

## 🏗️ Architecture

```
uwu-chan-saas/
├── src/
│   ├── commands/           # Slash command handlers
│   │   ├── v1-v2/         # Free tier commands
│   │   ├── v3-v5/         # Premium tier commands
│   │   └── v6-v8/         # Enterprise tier commands
│   ├── guards/
│   │   └── versionGuard.js # Tier-based access control
│   ├── handlers/
│   │   ├── commandHandler.js  # Command registration
│   │   └── prefixHandler.js   # Legacy prefix support
│   ├── systems/
│   │   ├── staffSystem.js     # Staff management logic
│   │   ├── ticketSystem.js    # Ticket workflows
│   │   ├── moderationSystem.js # Moderation actions
│   │   ├── analyticsSystem.js  # Data analytics
│   │   ├── automationSystem.js # Automation rules
│   │   └── licenseSystem.js    # License management
│   ├── utils/
│   │   ├── enhancedEmbeds.js  # Rich embed utilities
│   │   ├── logger.js          # Winston logging
│   │   └── cache.js           # Redis caching
│   ├── middleware/
│   │   └── validation.js      # NoSQL injection protection
│   ├── webhook/
│   │   └── paymentWebhook.js  # Stripe/PayPal webhooks
│   ├── database/
│   │   └── mongo.js           # MongoDB connection
│   ├── models/
│   │   └── activity.js        # Mongoose schemas
│   └── index.js               # Bot entry point
├── package.json
└── README.md
```

---

## 🔐 Security Features

### NoSQL Injection Protection
All user inputs are validated against MongoDB operator patterns:
- Blocks `$where`, `$ne`, `$gt`, `$regex` operators
- Recursive object checking for nested payloads
- Sanitization of HTML characters (`<`, `>`)

### Rate Limiting
```javascript
// Express rate limiting middleware
express-rate-limit: ^7.5.0
```
- Default: 100 requests per 15 minutes
- Webhook endpoints: 10 requests per minute

### Webhook Verification
- **Stripe**: Signature verification using `stripe.webhooks.constructEvent()`
- **PayPal**: Transmission ID, timestamp, and signature validation
- **Idempotency checks**: Duplicate webhook prevention

### Discord ID Validation
- Validates 17-20 digit snowflake format
- Prevents injection via user/guild IDs

---

## 🚀 Deployment

### Railway (Recommended)

1. Fork this repository
2. Connect to Railway dashboard
3. Add environment variables
4. Deploy with auto-scaling

See [RAILWAY_SIMPLE.md](RAILWAY_SIMPLE.md) for detailed setup.

### Multi-Instance Deployment

Configure `ENABLED_TIERS` for isolated bot instances:

| Instance | ENABLED_TIERS | Purpose |
|----------|---------------|---------|
| Free Bot | `v1,v2` | Public free tier |
| Premium Bot | `v3,v4,v5` | Premium subscribers |
| Enterprise Bot | `v6,v7,v8` | Enterprise customers |

### Docker

```bash
# Build image
docker build -t uwu-chan-saas .

# Run container
docker run -d \
  --name uwu-chan \
  --env-file .env \
  -p 3000:3000 \
  uwu-chan-saas
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run linting
npm run lint
```

---

## 📸 Screenshots

### Rich Embed Example
> Staff statistics displayed with color-coded tier branding, progress bars, and interactive refresh button

### Progress Bar Visualization
> Real-time completion tracking with `████████░░░ 73%` style bars

### Interactive Buttons
> Pagination controls, export options, and confirmation dialogs

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Support

- **Discord**: [Join our support server](https://discord.gg/uwu-chan)
- **Documentation**: [Wiki](https://github.com/Reyrey-mibombo/uwu-chan-saas/wiki)
- **Issues**: [GitHub Issues](https://github.com/Reyrey-mibombo/uwu-chan-saas/issues)

---

<div align="center">

**Made with 💖 by Reyrey-mibombo**

</div>
