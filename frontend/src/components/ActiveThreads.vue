<template>
  <div class="active-threads">
    <h3 class="active-threads-title">
      <Icon icon="mdi:fire"></Icon>
      Aktywne wątki
    </h3>
    <div v-for="thread in threads" :key="thread.id" class="active-thread">
      <div class="active-thread-avatar">
        {{ thread.author.charAt(0) }}
      </div>
      <div class="active-thread-content">
        <a  class="active-thread-title" @click="selectThread(thread)">{{ thread.title }}</a>
        <div class="active-thread-info">
          <span>{{ thread.author }}</span>
          <span>{{ thread.date }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Icon } from "@iconify/vue";
export default {
  name: 'ActiveThreads',
  components: {
    Icon
  },
  props: {
    threads: Array
  },
  methods: {
    selectThread(thread) {
      if (!thread) {
        console.error('CategoryPage - BŁĄD: thread jest undefined/null');
        return;
      }
      
      if (!thread.id) {
        console.error('CategoryPage - BŁĄD: thread nie ma ID:', thread);
        return;
      }
      
      try {
        console.log(thread);
        this.$emit('select-thread', thread);
      } catch (error) {
        console.error('CategoryPage - BŁĄD podczas emitowania:', error);
      }
    }
  }
}
</script>
