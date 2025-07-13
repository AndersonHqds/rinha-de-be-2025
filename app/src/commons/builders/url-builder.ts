export class UrlBuilder {
    private baseUrl: string;

    private constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    static build(baseUrl: string): UrlBuilder {
        if (!baseUrl?.endsWith('/')) {
            baseUrl = `${baseUrl}/`;
        }

        return new UrlBuilder(baseUrl);
    }

    url(path: string): string {
        return `${this.baseUrl}${path}`;
    }
}