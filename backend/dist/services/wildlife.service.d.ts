export interface IYouTubeStream {
    video_id: string;
    title: string;
    channel_title: string;
    thumbnail_url: string;
}
/**
 * Busca videos en vivo en YouTube basados en filtros.
 * Implementa un TTL Cache estricto para proteger cuotas de API.
 */
export declare function buscarStreamsYouTube(animal?: string, region?: string): Promise<IYouTubeStream[]>;
//# sourceMappingURL=wildlife.service.d.ts.map