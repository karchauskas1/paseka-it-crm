import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { ParserConfig, ParsedProfile, ParsedPost, ParseResult } from './types'

export abstract class BaseScraper {
  protected browser: Browser | null = null
  protected context: BrowserContext | null = null
  protected page: Page | null = null
  protected config: ParserConfig

  constructor(config: ParserConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      maxPages: 5,
      maxPosts: 50,
      delay: 1000,
      ...config,
    }
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    })

    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'ru-RU',
    })

    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(this.config.timeout!)
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.context = null
      this.page = null
    }
  }

  protected async delay(ms?: number): Promise<void> {
    const delay = ms || this.config.delay || 1000
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  protected async scrollToBottom(maxScrolls: number = 5): Promise<void> {
    if (!this.page) return

    for (let i = 0; i < maxScrolls; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await this.delay(1500)
    }
  }

  protected async safeText(selector: string): Promise<string | undefined> {
    try {
      const element = await this.page?.$(selector)
      if (element) {
        return (await element.textContent())?.trim()
      }
    } catch {
      return undefined
    }
    return undefined
  }

  protected async safeAttr(selector: string, attr: string): Promise<string | undefined> {
    try {
      const element = await this.page?.$(selector)
      if (element) {
        return (await element.getAttribute(attr)) || undefined
      }
    } catch {
      return undefined
    }
    return undefined
  }

  protected parseNumber(str?: string): number | undefined {
    if (!str) return undefined
    // Обрабатываем "1.2K", "3.5M" и т.д.
    const cleaned = str.replace(/\s/g, '').toLowerCase()
    const match = cleaned.match(/^([\d.,]+)([km])?$/)
    if (!match) return undefined

    let num = parseFloat(match[1].replace(',', '.'))
    if (match[2] === 'k') num *= 1000
    if (match[2] === 'm') num *= 1000000

    return Math.round(num)
  }

  abstract scrapePopular(): Promise<ParseResult>
  abstract scrapeSearch(query: string): Promise<ParseResult>
  abstract scrapeProfile(username: string): Promise<ParsedProfile | null>
}
