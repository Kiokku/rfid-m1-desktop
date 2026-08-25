export type Section = 'workbench' | 'customers'

export const navigationItems: ReadonlyArray<{ icon: 'grid' | 'users'; label: string; section: Section }> = [
  { icon: 'grid', label: '工作台', section: 'workbench' },
  { icon: 'users', label: '客户', section: 'customers' },
]

export const workbenchSteps = ['选择客户', '放置卡片', '执行授权', '验证结果']
