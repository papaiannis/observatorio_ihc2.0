import { google } from 'googleapis';
import NodeCache from 'node-cache';
import { env } from '../infrastructure/config.js';
import { AppError } from '../infrastructure/AppError.js';

// Caché global: máximo 100 elementos, 20 minutos de TTL (1200 segundos)
const streamsCache = new NodeCache({ stdTTL: 1200, maxKeys: 100 });

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
export async function buscarStreamsYouTube(animal?: string, region?: string): Promise<IYouTubeStream[]> {
  if (!env.YOUTUBE_API_KEY) {
    throw new AppError("La API Key de YouTube no está configurada en el servidor.", 500);
  }

  // Construir el query
  const queryParts = ["wildlife live cam"];
  if (animal) queryParts.push(animal);
  if (region) queryParts.push(region);
  
  const query = queryParts.join(" ");

  // Revisar caché
  const cachedResults = streamsCache.get<IYouTubeStream[]>(query);
  if (cachedResults) {
    console.log(`Retornando resultados desde caché para la búsqueda: '${query}'`);
    return cachedResults;
  }

  console.log(`Consultando YouTube API para: '${query}'`);

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: env.YOUTUBE_API_KEY
    });

    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: ['video'],
      eventType: 'live',
      maxResults: 10
    });

    const resultados: IYouTubeStream[] = (response.data.items || []).map(item => ({
      video_id: item.id?.videoId || "",
      title: item.snippet?.title || "",
      channel_title: item.snippet?.channelTitle || "",
      thumbnail_url: item.snippet?.thumbnails?.high?.url || ""
    }));

    // Guardar en caché
    streamsCache.set(query, resultados);
    return resultados;

  } catch (error: any) {
    console.error(`Error de YouTube API:`, error?.response?.data || error.message);
    throw new AppError("Ocurrió un error al consultar las transmisiones en vivo.", 502);
  }
}
