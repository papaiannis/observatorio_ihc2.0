"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buscarStreamsYouTube = buscarStreamsYouTube;
const googleapis_1 = require("googleapis");
const node_cache_1 = __importDefault(require("node-cache"));
const config_1 = require("../infrastructure/config");
const AppError_1 = require("../infrastructure/AppError");
// Caché global: máximo 100 elementos, 20 minutos de TTL (1200 segundos)
const streamsCache = new node_cache_1.default({ stdTTL: 1200, maxKeys: 100 });
/**
 * Busca videos en vivo en YouTube basados en filtros.
 * Implementa un TTL Cache estricto para proteger cuotas de API.
 */
async function buscarStreamsYouTube(animal, region) {
    if (!config_1.env.YOUTUBE_API_KEY) {
        throw new AppError_1.AppError("La API Key de YouTube no está configurada en el servidor.", 500);
    }
    // Construir el query
    const queryParts = ["wildlife live cam"];
    if (animal)
        queryParts.push(animal);
    if (region)
        queryParts.push(region);
    const query = queryParts.join(" ");
    // Revisar caché
    const cachedResults = streamsCache.get(query);
    if (cachedResults) {
        console.log(`Retornando resultados desde caché para la búsqueda: '${query}'`);
        return cachedResults;
    }
    console.log(`Consultando YouTube API para: '${query}'`);
    try {
        const youtube = googleapis_1.google.youtube({
            version: 'v3',
            auth: config_1.env.YOUTUBE_API_KEY
        });
        const response = await youtube.search.list({
            part: ['snippet'],
            q: query,
            type: ['video'],
            eventType: 'live',
            maxResults: 10
        });
        const resultados = (response.data.items || []).map(item => ({
            video_id: item.id?.videoId || "",
            title: item.snippet?.title || "",
            channel_title: item.snippet?.channelTitle || "",
            thumbnail_url: item.snippet?.thumbnails?.high?.url || ""
        }));
        // Guardar en caché
        streamsCache.set(query, resultados);
        return resultados;
    }
    catch (error) {
        console.error(`Error de YouTube API:`, error?.response?.data || error.message);
        throw new AppError_1.AppError("Ocurrió un error al consultar las transmisiones en vivo.", 502);
    }
}
//# sourceMappingURL=wildlife.service.js.map