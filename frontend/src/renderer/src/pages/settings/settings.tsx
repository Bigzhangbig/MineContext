// Copyright (c) 2025 Beijing Volcano Engine Technology Co., Ltd.
// SPDX-License-Identifier: Apache-2.0

import { FC, useMemo, useEffect } from 'react'
import { Form, Button, Select, Input, Typography, Spin, Message } from '@arco-design/web-react'
import { find, get, isEmpty, pick } from 'lodash'

import ModelRadio from './components/modelRadio/model-radio'
import { ModelTypeList, BaseUrl, embeddingModels, ModelInfoList } from './constants'
import { getModelInfo, ModelConfigProps, updateModelSettingsAPI } from '../../services/Settings'
import { useMemoizedFn, useMount, useRequest } from 'ahooks'

const FormItem = Form.Item
const { Text } = Typography

interface SettingsProps {
  closeSetting?: () => void
  init?: boolean
}
export interface InputPrefixProps {
  label: string
}
const InputPrefix: FC<InputPrefixProps> = (props) => {
  const { label } = props
  return <div className="flex w-[73px] items-center">{label}</div>
}
export interface CustomFormItemsProps {
  prefix: string
}
const CustomFormItems: FC<CustomFormItemsProps> = (props) => {
  const { prefix } = props
  return (
    <div className="flex flex-col gap-6 mb-6">
      <div className="flex flex-col gap-[8px]">
        <span className="text-[#0B0B0F] font-roboto text-base font-normal leading-[22px] ">
          Vision language model
        </span>
        <FormItem
          field={`${prefix}-modelId`}
          className="!mb-0"
          rules={[{ required: true, message: 'Cannot be empty' }]}
          requiredSymbol={false}>
          <Input
            addBefore={<InputPrefix label="Model name" />}
            placeholder="A VLM model with visual understanding capabilities is required."
            allowClear
            className="[&_.arco-input-inner-wrapper]: !w-[574px]"
          />
        </FormItem>
        <FormItem
          field={`${prefix}-baseUrl`}
          className="!mb-0"
          rules={[{ required: true, message: 'Cannot be empty' }]}
          requiredSymbol={false}>
          <Input
            addBefore={<InputPrefix label="Base URL" />}
            placeholder="Enter your base URL"
            allowClear
            className="[&_.arco-input-inner-wrapper]: !w-[574px]"
          />
        </FormItem>
        <FormItem
          field={`${prefix}-apiKey`}
          className="!mb-0"
          rules={[{ required: true, message: 'Cannot be empty' }]}
          requiredSymbol={false}>
          <Input.Password
            addBefore={<InputPrefix label="API Key" />}
            placeholder="Enter your API Key"
            allowClear
            className="!w-[574px]"
            defaultVisibility={false}
          />
        </FormItem>
      </div>
    </div>
  )
}
export interface StandardFormItemsProps {
  modelPlatform: ModelTypeList
  prefix: string
}
const StandardFormItems: FC<StandardFormItemsProps> = (props) => {
  const { modelPlatform, prefix } = props
  const option = useMemo(() => {
    const foundItem = find(ModelInfoList, (item) => item.value === modelPlatform)
    return foundItem ? foundItem.option : []
  }, [modelPlatform])

  return (
    <>
      <FormItem
        label="Select AI model"
        field={`${prefix}-modelId`}
        requiredSymbol={false}
        rules={[
          {
            validator(value, callback) {
              if (!value) {
                callback('Please select AI model')
              } else {
                callback()
              }
            }
          }
        ]}>
        <Select allowCreate placeholder="please select" options={option} className="!w-[574px]" />
      </FormItem>
      <FormItem
        requiredSymbol={false}
        label="API Key"
        field={`${prefix}-apiKey`}
        extra={
          <div className="flex items-center text-[#6E718C] text-[14px] ">
            You can get the API Key Here:
            <Button
              onClick={() => {
                const url =
                  modelPlatform === ModelTypeList.Doubao
                    ? 'https://www.volcengine.com/docs/82379/1541594'
                    : modelPlatform === ModelTypeList.Gemini
                      ? 'https://aistudio.google.com/apikey'
                      : 'https://platform.openai.com/settings/organization/api-keys'
                window.open(`${url}`)
              }}
              type="text">
              {modelPlatform === ModelTypeList.Doubao
                ? 'Get Doubao API Key'
                : modelPlatform === ModelTypeList.Gemini
                  ? 'Get Gemini API Key'
                  : 'Get OpenAI API Key'}
            </Button>
          </div>
        }
        rules={[
          {
            validator(value, callback) {
              if (!value) {
                callback('Please enter your API key')
              } else {
                callback()
              }
            }
          }
        ]}>
        <Input.Password
          autoFocus
          placeholder="Enter your API key"
          allowClear
          className="!w-[574px]"
          defaultVisibility={false}
        />
      </FormItem>
    </>
  )
}

export interface EmbeddingStandardFormItemsProps {
  modelPlatform: ModelTypeList
  prefix: string
}
const EmbeddingStandardFormItems: FC<EmbeddingStandardFormItemsProps> = (props) => {
  const { modelPlatform, prefix } = props
  const defaultEmbModel = useMemo(() => {
    switch (modelPlatform) {
      case ModelTypeList.Doubao:
        return embeddingModels.DoubaoEmbeddingModelId
      case ModelTypeList.OpenAI:
        return embeddingModels.OpenAIEmbeddingModelId
      case ModelTypeList.Gemini:
        return embeddingModels.GeminiEmbeddingModelId
      default:
        return ''
    }
  }, [modelPlatform])

  return (
    <div className="flex flex-col gap-6 mb-6">
      <div className="flex flex-col gap-[8px]">
        <FormItem
          field={`${prefix}-embeddingModelId`}
          className="!mb-0"
          requiredSymbol={false}
          extra={
            <Text type="secondary" className="text-[12px]">
              Default: {defaultEmbModel}
            </Text>
          }>
          <Input placeholder={defaultEmbModel || 'Enter embedding model name'} allowClear className="!w-[574px]" />
        </FormItem>
        <FormItem
          field={`${prefix}-embeddingApiKey`}
          className="!mb-0"
          requiredSymbol={false}
          extra={
            <Text type="secondary" className="text-[12px]">
              Leave empty to use the VLM API key
            </Text>
          }>
          <Input.Password
            placeholder="Enter embedding API key (optional)"
            allowClear
            className="!w-[574px]"
            defaultVisibility={false}
          />
        </FormItem>
      </div>
    </div>
  )
}

export interface EmbeddingCustomFormItemsProps {
  prefix: string
}
const EmbeddingCustomFormItems: FC<EmbeddingCustomFormItemsProps> = (props) => {
  const { prefix } = props
  return (
    <div className="flex flex-col gap-6 mb-6">
      <div className="flex flex-col gap-[8px]">
        <FormItem
          field={`${prefix}-embeddingModelId`}
          className="!mb-0"
          rules={[{ required: true, message: 'Cannot be empty' }]}
          requiredSymbol={false}>
          <Input
            addBefore={<InputPrefix label="Model name" />}
            placeholder="Enter your embedding model name"
            allowClear
            className="!w-[574px]"
          />
        </FormItem>
        <FormItem
          field={`${prefix}-embeddingBaseUrl`}
          className="!mb-0"
          rules={[{ required: true, message: 'Cannot be empty' }]}
          requiredSymbol={false}>
          <Input
            addBefore={<InputPrefix label="Base URL" />}
            placeholder="Enter your base URL"
            allowClear
            className="!w-[574px]"
          />
        </FormItem>
        <FormItem
          field={`${prefix}-embeddingApiKey`}
          className="!mb-0"
          requiredSymbol={false}>
          <Input.Password
            addBefore={<InputPrefix label="API Key" />}
            placeholder="Enter your API Key (leave empty to use VLM key)"
            allowClear
            className="!w-[574px]"
            defaultVisibility={false}
          />
        </FormItem>
      </div>
    </div>
  )
}

export interface SettingsFormBase {
  modelPlatform: string
  embeddingModelPlatform: string
}

type VlmFormFields = {
  [K in ModelTypeList as `${K}-modelId` | `${K}-apiKey` | `${K}-baseUrl`]?: string
}

type EmbeddingFormFields = {
  [K in ModelTypeList as
    | `emb-${K}-embeddingModelId`
    | `emb-${K}-embeddingApiKey`
    | `emb-${K}-embeddingBaseUrl`]?: string
}

export type SettingsFormProps = SettingsFormBase & VlmFormFields & EmbeddingFormFields
const Settings: FC<SettingsProps> = (props) => {
  const { closeSetting, init } = props

  const [form] = Form.useForm<SettingsFormProps>()
  const { run: getInfo, loading: getInfoLoading, data: modelInfo } = useRequest(getModelInfo, { manual: true })

  const { run: updateModelSettings, loading: updateLoading } = useRequest(updateModelSettingsAPI, {
    manual: true,
    onSuccess() {
      Message.success('Your API key saved successfully')
      getInfo()
      if (init) {
        closeSetting?.()
      }
    },
    onError(e: Error) {
      const errMsg = get(e, 'response.data.message') || get(e, 'message') || 'Failed to save settings'
      Message.error(errMsg)
    }
  })
  const submit = useMemoizedFn(async () => {
    try {
      await form.validate()
      const values = form.getFieldsValue()
      const vlmPlatform = values.modelPlatform
      const embPlatform = values.embeddingModelPlatform

      if (!vlmPlatform) {
        Message.error('Please select a Vision Language Model platform')
        return
      }
      if (!embPlatform) {
        Message.error('Please select an Embedding Model platform')
        return
      }

      // --- VLM params ---
      const isVlmCustom = vlmPlatform === ModelTypeList.Custom
      const vlmRaw = pick(values, [
        `${vlmPlatform}-modelId`,
        `${vlmPlatform}-apiKey`,
        `${vlmPlatform}-baseUrl`
      ])
      const vlmFields = Object.fromEntries(
        Object.entries(vlmRaw).map(([key, value]) => [key.replace(`${vlmPlatform}-`, ''), value])
      )

      const getVlmBaseUrl = (p: string): string => {
        switch (p) {
          case ModelTypeList.Doubao:
            return BaseUrl.DoubaoUrl
          case ModelTypeList.Gemini:
            return BaseUrl.GeminiVLMUrl
          default:
            return BaseUrl.OpenAIUrl
        }
      }

      const vlmParams = isVlmCustom
        ? vlmFields
        : { ...vlmFields, baseUrl: getVlmBaseUrl(vlmPlatform) }

      // --- Embedding params ---
      const isEmbCustom = embPlatform === ModelTypeList.Custom
      const embPrefix = `emb-${embPlatform}`
      const embRaw = pick(values, [
        `${embPrefix}-embeddingModelId`,
        `${embPrefix}-embeddingApiKey`,
        `${embPrefix}-embeddingBaseUrl`
      ])
      const embFields = Object.fromEntries(
        Object.entries(embRaw).map(([key, value]) => [key.replace(`${embPrefix}-`, ''), value])
      )

      const getDefaultEmbModel = (p: string): string => {
        switch (p) {
          case ModelTypeList.Doubao:
            return embeddingModels.DoubaoEmbeddingModelId
          case ModelTypeList.Gemini:
            return embeddingModels.GeminiEmbeddingModelId
          default:
            return embeddingModels.OpenAIEmbeddingModelId
        }
      }

      const getEmbBaseUrl = (p: string): string => {
        switch (p) {
          case ModelTypeList.Doubao:
            return BaseUrl.DoubaoUrl
          case ModelTypeList.Gemini:
            return BaseUrl.GeminiAPIUrl
          default:
            return BaseUrl.OpenAIUrl
        }
      }

      const embParams = isEmbCustom
        ? embFields
        : {
            ...embFields,
            embeddingModelId: embFields.embeddingModelId || getDefaultEmbModel(embPlatform),
            embeddingBaseUrl: embFields.embeddingBaseUrl || getEmbBaseUrl(embPlatform)
          }

      const params = {
        modelPlatform: vlmPlatform,
        ...vlmParams,
        ...embParams,
        embeddingModelPlatform: embPlatform !== vlmPlatform ? embPlatform : undefined
      }

      updateModelSettings(params as unknown as ModelConfigProps)
    } catch (error: any) {}
  })

  useMount(() => {
    getInfo()
  })
  useEffect(() => {
    const config = get(modelInfo, 'config')
    if (getInfoLoading || isEmpty(config)) return

    if (init) {
      // Auto-close settings if model is already configured
      if (config.modelPlatform && config.modelId && config.apiKey) {
        closeSetting?.()
        return
      }
    } else {
      const settingsValue = new Map<keyof SettingsFormProps, string>()

      const vlmPlatform = (config.modelPlatform || ModelTypeList.Doubao) as ModelTypeList
      settingsValue.set('modelPlatform', vlmPlatform)

      const vlmConfigKeys = ['modelId', 'apiKey', 'baseUrl'] as const
      vlmConfigKeys.forEach((key) => {
        if (config[key]) {
          settingsValue.set(`${vlmPlatform}-${key}` as keyof SettingsFormProps, config[key])
        }
      })

      const embPlatform = (config.embeddingModelPlatform || vlmPlatform) as ModelTypeList
      settingsValue.set('embeddingModelPlatform', embPlatform)

      const embConfigKeys = ['embeddingModelId', 'embeddingApiKey', 'embeddingBaseUrl'] as const
      embConfigKeys.forEach((key) => {
        if (config[key]) {
          settingsValue.set(`emb-${embPlatform}-${key}` as keyof SettingsFormProps, config[key])
        }
      })

      form.setFieldsValue(Object.fromEntries(settingsValue))
    }
  }, [modelInfo, getInfoLoading])

  return (
    <Spin loading={getInfoLoading} block className="[&_.arco-spin-children]:!h-full !h-full">
      <div className="top-0 left-0 flex flex-col h-full overflow-y-hidden py-2 pr-2 relative">
        <div className="bg-white rounded-[16px] pl-6 flex flex-col h-full overflow-y-auto overflow-x-hidden scrollbar-hide pb-2">
          <div className="mb-[12px]">
            <div className="mt-[26px] mb-[10px] text-[24px] font-bold text-[#000]">Select a AI model to start</div>
            <Text type="secondary" className="text-[13px]">
              Configure AI model and API Key, then you can start MineContext’s intelligent context capability
            </Text>
          </div>

          <div>
            <Form
              autoComplete="off"
              layout={'vertical'}
              form={form}
              initialValues={{
                modelPlatform: ModelTypeList.Doubao,
                embeddingModelPlatform: ModelTypeList.Doubao,
                [`${ModelTypeList.Doubao}-modelId`]: 'doubao-seed-1-6-flash-250828',
                [`${ModelTypeList.OpenAI}-modelId`]: 'gpt-5-nano',
                [`${ModelTypeList.Gemini}-modelId`]: 'gemini-2.5-flash',
                [`emb-${ModelTypeList.Doubao}-embeddingModelId`]: embeddingModels.DoubaoEmbeddingModelId,
                [`emb-${ModelTypeList.OpenAI}-embeddingModelId`]: embeddingModels.OpenAIEmbeddingModelId,
                [`emb-${ModelTypeList.Gemini}-embeddingModelId`]: embeddingModels.GeminiEmbeddingModelId
              }}>
              <FormItem label="Model platform" field={'modelPlatform'} requiredSymbol={false}>
                <ModelRadio />
              </FormItem>
              <FormItem
                shouldUpdate={(prevValues, currentValues) => prevValues.modelPlatform !== currentValues.modelPlatform}
                noStyle>
                {(values) => {
                  const modelPlatform = values.modelPlatform
                  if (modelPlatform === ModelTypeList.Custom) {
                    return <CustomFormItems prefix={ModelTypeList.Custom} />
                  } else if (modelPlatform === ModelTypeList.Doubao) {
                    return <StandardFormItems modelPlatform={modelPlatform} prefix={ModelTypeList.Doubao} />
                  } else if (modelPlatform === ModelTypeList.Gemini) {
                    return <StandardFormItems modelPlatform={modelPlatform} prefix={ModelTypeList.Gemini} />
                  } else if (modelPlatform === ModelTypeList.OpenAI) {
                    return <StandardFormItems modelPlatform={modelPlatform} prefix={ModelTypeList.OpenAI} />
                  } else {
                    return null
                  }
                }}
              </FormItem>
              <div className="mt-6 mb-[12px]">
                <span className="text-[#0B0B0F] font-roboto text-base font-normal leading-[22px]">
                  Embedding model
                </span>
              </div>
              <FormItem label="Embedding platform" field={'embeddingModelPlatform'} requiredSymbol={false}>
                <ModelRadio />
              </FormItem>
              <FormItem
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.embeddingModelPlatform !== currentValues.embeddingModelPlatform
                }
                noStyle>
                {(values) => {
                  const embPlatform = values.embeddingModelPlatform
                  if (embPlatform === ModelTypeList.Custom) {
                    return <EmbeddingCustomFormItems prefix="emb-custom" />
                  } else if (embPlatform === ModelTypeList.Doubao) {
                    return <EmbeddingStandardFormItems modelPlatform={embPlatform} prefix="emb-doubao" />
                  } else if (embPlatform === ModelTypeList.Gemini) {
                    return <EmbeddingStandardFormItems modelPlatform={embPlatform} prefix="emb-gemini" />
                  } else if (embPlatform === ModelTypeList.OpenAI) {
                    return <EmbeddingStandardFormItems modelPlatform={embPlatform} prefix="emb-openai" />
                  } else {
                    return null
                  }
                }}
              </FormItem>
            </Form>
            <Spin loading={updateLoading}>
              <Button type="primary" onClick={submit} disabled={updateLoading} className="!bg-[#000]">
                {init ? 'Get started' : 'Save'}
              </Button>
            </Spin>
          </div>
        </div>
      </div>
    </Spin>
  )
}

export default Settings
