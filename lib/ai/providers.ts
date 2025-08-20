import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openai.responses('gpt-4.1-mini'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai.responses('gpt-4.1'),
          middleware: extractReasoningMiddleware({tagName: 'think'}),
        }),
        'title-model': openai('gpt-4o-mini'),
        'artifact-model': openai('gpt-4o-mini'),
      },
      imageModels: {
        'small-model': openai.image('gpt-image-1'),
        'large-model': openai.image('gpt-image-1'),
      },
    });


    //'chat-model': xai('grok-2-vision-1212'),
        //'chat-model-reasoning': wrapLanguageModel({
          //model: xai('grok-3-mini-beta'),
          //middleware: extractReasoningMiddleware({ tagName: 'think' }),
        //}),
        //'title-model': xai('grok-2-1212'),
        //'artifact-model': xai('grok-2-1212'),