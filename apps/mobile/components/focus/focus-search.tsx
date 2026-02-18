import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, theme } from '~/theme';
import { borderStyle } from '~/theme/styles';

export type ActiveSearch = {
  count: number
  keyword: string
}

export const ActiveSearchSummary = React.memo(
  ({ activeSearch, onCloseClick }: { activeSearch: ActiveSearch; onCloseClick: () => void }) => {
    return (
      <View style={[searchHeaderStyles.container]}>
        <View style={{ flex: 1, alignContent: 'center' }}>
          <Text variant="body" color="fg-primary" style={[searchHeaderStyles.searchText]}>
            {activeSearch.count} results for "{activeSearch.keyword}"
          </Text>
        </View>
        <View>
          <Pressable onPress={onCloseClick} style={[searchHeaderStyles.clearButton]}>
            <Text variant="body" color="white">
              Clear search
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }
)

const searchHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    backgroundColor: theme.colors.grayDark,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...borderStyle.border,
  },
  searchText: {
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.white,
    alignItems: 'center',
    // backgroundColor: theme.colors.grayDark,
    paddingVertical: 8,
  },
  clearButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
})
