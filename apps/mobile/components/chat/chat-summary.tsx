import { FontAwesome } from '@expo/vector-icons';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import type { ChatMessagesResponse } from '~/utils/schema/schema-types';
import { Text, theme } from '~/theme';

import { Card } from '../ui/card';

export const ChatSummary = ({ summary }: { summary: ChatMessagesResponse['summary'] }) => {
  return (
    <View style={{ paddingHorizontal: 12 }}>
      <Card>
        <ScrollView style={{ maxHeight: 200 }}>
          <View
            style={{
              rowGap: 14,
              paddingVertical: 8,
              paddingHorizontal: 18,
            }}>
            <Text variant="title">Summary</Text>
            <View style={{ rowGap: 10, paddingVertical: 8 }}>
              {summary.map((item) => (
                <View
                  key={item.text}
                  style={{ columnGap: 8, alignItems: 'center', flexDirection: 'row' }}>
                  <FontAwesome name="circle-o" size={16} color={theme.colors.gray} />
                  <Text key={item.text} variant="body">
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>
    </View>
  );
};
