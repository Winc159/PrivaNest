/**
 * 媒体控制器统一入口
 * 
 * @deprecated 请使用具体的控制器模块：
 * - libraryController: 媒体库管理和文件夹浏览
 * - fileMediaController: 媒体文件流式传输和缩略图
 * - metadataController: 元数据管理和搜索
 */

import { libraryController } from './library.controller.js'
import { mediaController as fileMediaController } from './media.controller.js'
import { metadataController } from './metadata.controller.js'

// 为了向后兼容，合并所有控制器
export const mediaController = {
  ...libraryController,
  ...fileMediaController,
  ...metadataController
}

// 单独导出各个控制器
export { libraryController, fileMediaController, metadataController }

