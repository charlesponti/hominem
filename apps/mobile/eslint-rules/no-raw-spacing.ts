import { ESLintUtils, TSESTree } from '@typescript-eslint/utils'

export const rule = ESLintUtils.RuleCreator(
  (name) => `https://example.com/rule/${name}`
)({
  name: 'no-raw-spacing',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw numeric spacing values in React Native styles; use theme spacing tokens.',
      recommended: 'warn',
    },
    schema: [],
    messages: {
      avoidNumber: 'Use a spacing token from theme instead of hardcoded number ({{value}}).',
    },
  },
  defaultOptions: [],
  create(context) {
    function inspectStyleObject(obj: TSESTree.ObjectExpression) {
      for (const prop of obj.properties) {
        if (prop.type !== 'Property' || prop.value.type === 'SpreadElement') continue
        if (prop.value.type === 'ObjectExpression') {
          inspectStyleObject(prop.value)
        } else if (
          prop.value.type === 'Literal' &&
          typeof prop.value.value === 'number'
        ) {
          context.report({
            node: prop.value,
            messageId: 'avoidNumber',
            data: { value: String(prop.value.value) },
          })
        }
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'StyleSheet' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'create'
        ) {
          const arg = node.arguments[0]
          if (arg && arg.type === 'ObjectExpression') {
            inspectStyleObject(arg)
          }
        }
      },
    }
  },
})
